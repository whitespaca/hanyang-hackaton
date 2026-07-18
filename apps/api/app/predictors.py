from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Literal

from PIL import Image

from app.domain import GARBAGE_CLASSES, GarbageClass, Prediction, Predictor
from app.schemas import ModelMetadata


class MockPredictor:
    model_name = "deterministic_mock"
    model_version = "mock-gcv2-001"
    inference_mode: Literal["mock"] = "mock"
    model_loaded = False

    def __init__(self, fallback_reason: str | None = None) -> None:
        self.fallback_reason = fallback_reason

    def predict(self, image: Image.Image, top_k: int = 3) -> list[Prediction]:
        digest = hashlib.sha256(image.tobytes()).digest()
        ranked = sorted(
            enumerate(GARBAGE_CLASSES),
            key=lambda item: digest[item[0]],
            reverse=True,
        )
        top_confidence = 0.48 + (digest[10] / 255) * 0.38
        second_confidence = min(0.33, (1 - top_confidence) * 0.68)
        third_confidence = max(0.01, 1 - top_confidence - second_confidence)
        confidence_values = [top_confidence, second_confidence, third_confidence]
        return [
            Prediction(
                class_name=class_name,
                confidence=round(confidence_values[index], 4),
            )
            for index, (_, class_name) in enumerate(ranked[:top_k])
        ]


class TorchPredictor:
    inference_mode: Literal["model"] = "model"
    model_loaded = True
    fallback_reason = None

    def __init__(self, model_path: Path, metadata_path: Path) -> None:
        try:
            import torch
            from torchvision import models, transforms
        except ImportError as exc:
            raise RuntimeError(
                "PyTorch dependencies are not installed; run uv sync --extra model"
            ) from exc

        if not model_path.is_file() or not metadata_path.is_file():
            raise FileNotFoundError("Model artifact or metadata is missing")
        metadata = ModelMetadata.model_validate_json(metadata_path.read_text(encoding="utf-8"))
        self.model_name = metadata.model_name
        self.model_version = metadata.model_version
        self._classes: tuple[GarbageClass, ...] = metadata.classes
        input_size = metadata.input_size
        model = models.mobilenet_v3_small(weights=None)
        last_layer = model.classifier[-1]
        in_features = int(last_layer.in_features)
        model.classifier[-1] = torch.nn.Linear(in_features, len(self._classes))
        state = torch.load(model_path, map_location="cpu", weights_only=True)
        model.load_state_dict(state)
        model.eval()
        self._torch = torch
        self._model = model
        resize_size = round(max(input_size) * 256 / 224)
        self._transform = transforms.Compose(
            [
                transforms.Resize(resize_size),
                transforms.CenterCrop(input_size),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=metadata.normalization.mean,
                    std=metadata.normalization.std,
                ),
            ]
        )

    def predict(self, image: Image.Image, top_k: int = 3) -> list[Prediction]:
        if top_k < 1 or top_k > len(self._classes):
            raise ValueError(f"top_k must be between 1 and {len(self._classes)}")
        tensor = self._transform(image.convert("RGB")).unsqueeze(0)
        with self._torch.inference_mode():
            probabilities = self._torch.softmax(self._model(tensor), dim=1)[0]
            values, indexes = probabilities.topk(top_k)
        return [
            Prediction(class_name=self._classes[int(index)], confidence=round(float(value), 4))
            for value, index in zip(values, indexes, strict=True)
        ]


def create_predictor(
    mode: Literal["mock", "model"],
    model_path: Path,
    metadata_path: Path,
    app_env: Literal["development", "test", "production"],
) -> Predictor:
    if mode == "mock":
        return MockPredictor()
    try:
        return TorchPredictor(model_path, metadata_path)
    except (OSError, ImportError, RuntimeError, ValueError) as exc:
        if app_env == "production":
            raise
        return MockPredictor(fallback_reason=str(exc))
