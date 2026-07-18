import torch

from modeling import build_metadata
from train import make_model


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
