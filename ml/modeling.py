from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from torch import nn
from torchvision import models

from dataset import EXPECTED_CLASSES

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
INPUT_SIZE = [224, 224]


def build_model(*, pretrained: bool) -> nn.Module:
    weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
    model = models.mobilenet_v3_small(weights=weights)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, len(EXPECTED_CLASSES))
    return model


def build_metadata(version: str | None = None) -> dict[str, Any]:
    resolved_version = version or f"mobilenetv3-small-gcv2-{datetime.now(UTC).strftime('%Y%m%d')}"
    return {
        "modelName": "mobilenet_v3_small",
        "modelVersion": resolved_version,
        "inputSize": INPUT_SIZE,
        "classes": list(EXPECTED_CLASSES),
        "normalization": {"mean": IMAGENET_MEAN, "std": IMAGENET_STD},
        "confidenceThreshold": 0.65,
    }
