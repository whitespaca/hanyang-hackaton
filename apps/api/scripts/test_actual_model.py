from __future__ import annotations

import io
import json

from fastapi.testclient import TestClient
from PIL import Image

from app.config import API_DIR, ROOT_DIR, Settings
from app.domain import GARBAGE_CLASSES
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
    result_body = result.json()
    predictions = result_body["predictions"]
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    assert health_body["inferenceMode"] == "model"
    assert health_body["modelLoaded"] is True
    assert health_body["fallbackReason"] is None
    assert health_body["modelVersion"] == metadata["modelVersion"]
    assert result_body["classificationId"]
    assert result_body["model"] == {
        "name": metadata["modelName"],
        "version": metadata["modelVersion"],
        "inferenceMode": "model",
    }
    assert len(predictions) == 3
    assert all(0 <= prediction["confidence"] <= 1 for prediction in predictions)
    assert all(prediction["className"] in GARBAGE_CLASSES for prediction in predictions)
    assert sum(prediction["confidence"] for prediction in predictions) <= 1.0001
    assert [prediction["confidence"] for prediction in predictions] == sorted(
        (prediction["confidence"] for prediction in predictions), reverse=True
    )
    print(f"PASS: actual model {health_body['modelVersion']} loaded without fallback")


if __name__ == "__main__":
    main()
