import torch
from torchvision import transforms

from modeling import IMAGENET_MEAN, IMAGENET_STD, build_metadata
from train import build_transforms, make_model


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
