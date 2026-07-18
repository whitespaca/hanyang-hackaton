import sys

import torch
from torchvision import transforms

from modeling import IMAGENET_MEAN, IMAGENET_STD, build_metadata
from train import (
    DEFAULT_NUM_WORKERS,
    build_transforms,
    device_summary,
    make_model,
    resolve_device,
)


def test_mobilenet_forward_shape() -> None:
    model = make_model(pretrained=False).eval()
    with torch.inference_mode():
        output = model(torch.zeros(1, 3, 224, 224))
    assert output.shape == (1, 10)


def test_metadata_matches_export_contract() -> None:
    metadata = build_metadata("smoke-model-001")
    assert metadata["modelVersion"] == "smoke-model-001"
    assert metadata["inputSize"] == [224, 224]
    assert len(metadata["classes"]) == 10


def test_evaluation_transform_matches_api_contract() -> None:
    _, evaluation = build_transforms()
    assert isinstance(evaluation.transforms[0], transforms.Resize)
    assert evaluation.transforms[0].size == 256
    assert isinstance(evaluation.transforms[1], transforms.CenterCrop)
    assert evaluation.transforms[1].size == (224, 224)
    normalization = evaluation.transforms[-1]
    assert isinstance(normalization, transforms.Normalize)
    assert list(normalization.mean) == IMAGENET_MEAN
    assert list(normalization.std) == IMAGENET_STD


def test_explicit_cpu_device_is_respected() -> None:
    device = resolve_device("cpu")
    summary = device_summary(device, amp_requested=True)

    assert device.type == "cpu"
    assert summary["deviceName"] == "CPU"
    assert summary["amp"] is False


def test_windows_uses_single_process_data_loading_by_default() -> None:
    if sys.platform == "win32":
        assert DEFAULT_NUM_WORKERS == 0
    else:
        assert DEFAULT_NUM_WORKERS >= 1
