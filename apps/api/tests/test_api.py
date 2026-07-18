from __future__ import annotations

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import ROOT_DIR, Settings
from app.main import create_app


def png_bytes(color: tuple[int, int, int] = (28, 120, 92)) -> bytes:
    stream = io.BytesIO()
    Image.new("RGB", (64, 64), color).save(stream, format="PNG")
    return stream.getvalue()


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    settings = Settings(
        app_env="test",
        inference_mode="mock",
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        guides_path=ROOT_DIR / "data" / "disposal-guides.ko.json",
        max_upload_bytes=1024,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def classify(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/v1/classifications",
        files={"image": ("fixture.png", png_bytes(), "image/png")},
        data={"client": "web"},
    )
    assert response.status_code == 200
    return response.json()


def test_health_mock_mode_and_request_id(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["inferenceMode"] == "mock"
    assert response.headers["X-Request-ID"]


def test_classification_top_three_is_deterministic_and_sorted(client: TestClient) -> None:
    first = classify(client)
    second = classify(client)
    predictions = first["predictions"]
    assert isinstance(predictions, list) and len(predictions) == 3
    assert [item["className"] for item in predictions] == [
        item["className"] for item in second["predictions"]
    ]
    assert [item["confidence"] for item in predictions] == sorted(
        [item["confidence"] for item in predictions], reverse=True
    )


def test_rejects_unsupported_corrupt_oversize_and_tiny_images(client: TestClient) -> None:
    unsupported = client.post(
        "/api/v1/classifications", files={"image": ("x.gif", b"GIF89a", "image/gif")}
    )
    assert unsupported.status_code == 415
    assert unsupported.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"

    corrupt = client.post(
        "/api/v1/classifications", files={"image": ("x.png", b"not-image", "image/png")}
    )
    assert corrupt.status_code == 422

    oversize = client.post(
        "/api/v1/classifications", files={"image": ("x.png", b"0" * 1025, "image/png")}
    )
    assert oversize.status_code == 413

    stream = io.BytesIO()
    Image.new("RGB", (16, 16)).save(stream, format="PNG")
    tiny = client.post(
        "/api/v1/classifications", files={"image": ("tiny.png", stream.getvalue(), "image/png")}
    )
    assert tiny.status_code == 422
    assert tiny.json()["error"]["code"] == "IMAGE_TOO_SMALL"


def test_guides_list_detail_and_missing(client: TestClient) -> None:
    listing = client.get("/api/v1/guides")
    assert listing.status_code == 200
    assert len(listing.json()["categories"]) == 10
    detail = client.get("/api/v1/guides/plastic/pet-bottle")
    assert detail.status_code == 200
    assert detail.json()["title"] == "투명 페트병"
    missing = client.get("/api/v1/guides/plastic/not-here")
    assert missing.status_code == 404
    assert missing.json()["error"]["requestId"]


def test_feedback_and_statistics(client: TestClient) -> None:
    result = classify(client)
    prediction = result["predictions"][0]
    selected = "plastic" if prediction["className"] != "plastic" else "glass"
    response = client.post(
        f"/api/v1/classifications/{result['classificationId']}/feedback",
        json={
            "predictedClass": prediction["className"],
            "selectedClass": selected,
            "subcategory": "plastic-container",
            "reason": "user_correction",
        },
    )
    assert response.status_code == 201
    statistics = client.get("/api/v1/statistics/summary").json()
    assert statistics["totalClassifications"] == 1
    assert statistics["correctionRate"] == 1
    assert statistics["dataMode"] == "live"


def test_model_mode_falls_back_only_outside_production(tmp_path: Path) -> None:
    development = Settings(
        app_env="development",
        inference_mode="model",
        database_url=f"sqlite:///{tmp_path / 'dev.db'}",
        guides_path=ROOT_DIR / "data" / "disposal-guides.ko.json",
    )
    with TestClient(create_app(development)) as fallback_client:
        health = fallback_client.get("/api/v1/health").json()
        assert health["inferenceMode"] == "mock"
        assert health["fallbackReason"]

    production = Settings(
        app_env="production",
        inference_mode="model",
        database_url=f"sqlite:///{tmp_path / 'prod.db'}",
        guides_path=ROOT_DIR / "data" / "disposal-guides.ko.json",
    )
    with pytest.raises((FileNotFoundError, RuntimeError)), TestClient(create_app(production)):
        pass
