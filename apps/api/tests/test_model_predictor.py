from __future__ import annotations

import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

torch = pytest.importorskip("torch")
models = pytest.importorskip("torchvision.models")

from app.config import ROOT_DIR, Settings  # noqa: E402
from app.domain import GARBAGE_CLASSES  # noqa: E402
from app.main import create_app  # noqa: E402
from app.predictors import MockPredictor, TorchPredictor, create_predictor  # noqa: E402


def write_artifact(directory: Path) -> tuple[Path, Path]:
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, 10)
    model_path = directory / "garbage_classifier.pt"
    metadata_path = directory / "metadata.json"
    torch.save(model.state_dict(), model_path)
    metadata_path.write_text(
        json.dumps(
            {
                "modelName": "mobilenet_v3_small",
                "modelVersion": "model-smoke-001",
                "inputSize": [224, 224],
                "classes": list(GARBAGE_CLASSES),
                "normalization": {
                    "mean": [0.485, 0.456, 0.406],
                    "std": [0.229, 0.224, 0.225],
                },
                "confidenceThreshold": 0.65,
            }
        ),
        encoding="utf-8",
    )
    return model_path, metadata_path


def test_torch_predictor_loads_export_contract_and_returns_top_three(tmp_path: Path) -> None:
    model_path, metadata_path = write_artifact(tmp_path)
    predictor = TorchPredictor(model_path, metadata_path)

    predictions = predictor.predict(Image.new("RGB", (64, 64), (84, 125, 93)))

    assert predictor.model_loaded is True
    assert predictor.inference_mode == "model"
    assert len(predictions) == 3
    assert [item.confidence for item in predictions] == sorted(
        [item.confidence for item in predictions], reverse=True
    )
    assert all(item.class_name in GARBAGE_CLASSES for item in predictions)


def test_torch_predictor_rejects_wrong_class_order(tmp_path: Path) -> None:
    model_path, metadata_path = write_artifact(tmp_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["classes"] = list(reversed(metadata["classes"]))
    metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

    with pytest.raises(ValueError, match="classes must match"):
        TorchPredictor(model_path, metadata_path)


def test_torch_predictor_rejects_invalid_metadata(tmp_path: Path) -> None:
    model_path, metadata_path = write_artifact(tmp_path)
    metadata_path.write_text("{not-json", encoding="utf-8")

    with pytest.raises(ValueError):
        TorchPredictor(model_path, metadata_path)


def test_torch_predictor_rejects_state_dict_shape_mismatch(tmp_path: Path) -> None:
    model_path, metadata_path = write_artifact(tmp_path)
    state = torch.load(model_path, map_location="cpu", weights_only=True)
    state.pop("classifier.3.weight")
    torch.save(state, model_path)

    with pytest.raises(RuntimeError):
        TorchPredictor(model_path, metadata_path)


def test_development_model_failure_falls_back_with_reason(tmp_path: Path) -> None:
    predictor = create_predictor(
        "model",
        tmp_path / "missing.pt",
        tmp_path / "missing.json",
        "development",
    )

    assert isinstance(predictor, MockPredictor)
    assert predictor.fallback_reason


def test_production_model_failure_does_not_fallback(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        create_predictor(
            "model",
            tmp_path / "missing.pt",
            tmp_path / "missing.json",
            "production",
        )


def test_production_model_mode_serves_health_and_classification(tmp_path: Path) -> None:
    model_path, metadata_path = write_artifact(tmp_path)
    settings = Settings(
        app_env="production",
        inference_mode="model",
        model_path=model_path,
        model_metadata_path=metadata_path,
        database_url=f"sqlite:///{tmp_path / 'model.db'}",
        guides_path=ROOT_DIR / "data" / "disposal-guides.ko.json",
        cors_origins="https://web.example.com",
    )
    image_stream = io.BytesIO()
    Image.new("RGB", (64, 64), (84, 125, 93)).save(image_stream, format="PNG")

    with TestClient(create_app(settings)) as client:
        health = client.get("/api/v1/health")
        classification = client.post(
            "/api/v1/classifications",
            files={"image": ("model-smoke.png", image_stream.getvalue(), "image/png")},
            data={"client": "web"},
        )

    assert health.status_code == 200
    assert health.json()["inferenceMode"] == "model"
    assert health.json()["modelLoaded"] is True
    assert health.json()["fallbackReason"] is None
    assert classification.status_code == 200
    assert classification.json()["model"]["inferenceMode"] == "model"
    assert len(classification.json()["predictions"]) == 3
