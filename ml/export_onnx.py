from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from dataset import EXPECTED_CLASSES
from modeling import build_model


def load_metadata(path: Path) -> dict[str, object]:
    metadata: object = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(metadata, dict):
        raise ValueError("metadata must be a JSON object")
    if metadata.get("classes") != list(EXPECTED_CLASSES):
        raise ValueError("metadata class order does not match the canonical contract")
    input_size = metadata.get("inputSize")
    if (
        not isinstance(input_size, list)
        or len(input_size) != 2
        or not all(isinstance(value, int) and value > 0 for value in input_size)
    ):
        raise ValueError("metadata inputSize must contain two positive integers")
    return metadata


def export_model(model_path: Path, metadata_path: Path, output_path: Path, opset: int) -> None:
    try:
        import onnx
    except ImportError as exc:
        raise RuntimeError("Install ONNX tools with: uv sync --extra onnx") from exc

    metadata = load_metadata(metadata_path)
    input_size = metadata["inputSize"]
    assert isinstance(input_size, list)
    model = build_model(pretrained=False)
    state = torch.load(model_path, map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    sample = torch.zeros(1, 3, input_size[0], input_size[1], dtype=torch.float32)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        sample,
        output_path,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=opset,
        dynamo=False,
    )
    loaded = onnx.load(output_path)
    onnx.checker.check_model(loaded)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export a Bunrishot checkpoint to ONNX")
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--opset", type=int, default=17)
    args = parser.parse_args()
    export_model(args.model, args.metadata, args.output, args.opset)
    print(f"PASS: ONNX checker accepted {args.output.resolve()}")


if __name__ == "__main__":
    main()
