from __future__ import annotations

import io

from fastapi.testclient import TestClient
from PIL import Image

from app.config import API_DIR, ROOT_DIR, Settings
from app.main import create_app


def main() -> None:
    model_path = API_DIR / "models" / "garbage_classifier.pt"
    metadata_path = API_DIR / "models" / "metadata.json"
    if not model_path.is_file() or not metadata_path.is_file():
        print("SKIP: actual model artifact or metadata is missing")
        return

    stream = io.BytesIO()
    Image.new("RGB", (64, 64), (28, 120, 92)).save(stream, format="PNG")
    settings = Settings(
        app_env="production",
        inference_mode="model",
        model_path=model_path,
        model_metadata_path=metadata_path,
        database_url="sqlite:///:memory:",
        guides_path=ROOT_DIR / "data" / "disposal-guides.ko.json",
        cors_origins="https://web.example.com",
    )
    with TestClient(create_app(settings)) as client:
        health = client.get("/api/v1/health")
        result = client.post(
            "/api/v1/classifications",
            files={"image": ("actual-model.png", stream.getvalue(), "image/png")},
            data={"client": "web"},
        )

    health.raise_for_status()
    result.raise_for_status()
    health_body = health.json()
    predictions = result.json()["predictions"]
    assert health_body["inferenceMode"] == "model"
    assert health_body["modelLoaded"] is True
    assert health_body["fallbackReason"] is None
    assert len(predictions) == 3
    assert all(0 <= prediction["confidence"] <= 1 for prediction in predictions)
    assert [prediction["confidence"] for prediction in predictions] == sorted(
        (prediction["confidence"] for prediction in predictions), reverse=True
    )
    print(f"PASS: actual model {health_body['modelVersion']} loaded without fallback")


if __name__ == "__main__":
    main()
