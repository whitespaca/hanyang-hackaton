from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from statistics import median
from typing import Any

import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from export_onnx import load_metadata
from modeling import build_model


def percentile(values: list[float], quantile: float) -> float:
    return float(np.percentile(np.asarray(values), quantile))


def load_inputs(metadata: dict[str, object], fixtures: list[Path]) -> list[torch.Tensor]:
    input_size = metadata["inputSize"]
    normalization = metadata.get("normalization")
    assert isinstance(input_size, list)
    if not isinstance(normalization, dict):
        raise ValueError("metadata normalization is missing")
    mean = normalization.get("mean")
    std = normalization.get("std")
    if not isinstance(mean, list) or not isinstance(std, list) or len(mean) != 3 or len(std) != 3:
        raise ValueError("metadata normalization must contain three mean and std values")
    transform = transforms.Compose(
        [
            transforms.Resize(round(max(input_size) * 256 / 224)),
            transforms.CenterCrop(input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std),
        ]
    )
    if fixtures:
        if len(fixtures) < 3:
            raise ValueError("Provide at least three --fixture images for parity evaluation")
        tensors: list[torch.Tensor] = []
        for fixture in fixtures:
            with Image.open(fixture) as source:
                tensors.append(transform(source.convert("RGB")).unsqueeze(0))
        return tensors
    generator = torch.Generator().manual_seed(42)
    return [torch.rand(1, 3, input_size[0], input_size[1], generator=generator) for _ in range(3)]


def evaluate(
    model_path: Path,
    metadata_path: Path,
    onnx_path: Path,
    fixtures: list[Path],
    warmup: int,
    samples: int,
) -> dict[str, Any]:
    try:
        import onnxruntime as ort
    except ImportError as exc:
        raise RuntimeError("Install ONNX tools with: uv sync --extra onnx") from exc

    metadata = load_metadata(metadata_path)
    model = build_model(pretrained=False)
    model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
    model.eval()
    inputs = load_inputs(metadata, fixtures)

    load_started = time.perf_counter()
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    cold_load_ms = (time.perf_counter() - load_started) * 1000
    input_name = session.get_inputs()[0].name
    maximum_error = 0.0
    top1_matches = 0
    top3_matches = 0
    probability_sum_errors: list[float] = []
    for tensor in inputs:
        with torch.inference_mode():
            torch_logits = model(tensor).numpy()
        onnx_logits = session.run(None, {input_name: tensor.numpy()})[0]
        maximum_error = max(maximum_error, float(np.max(np.abs(torch_logits - onnx_logits))))
        torch_probabilities = torch.softmax(torch.from_numpy(torch_logits), dim=1).numpy()
        onnx_probabilities = torch.softmax(torch.from_numpy(onnx_logits), dim=1).numpy()
        top1_matches += int(torch_probabilities.argmax(1)[0] == onnx_probabilities.argmax(1)[0])
        torch_top3 = np.argsort(torch_probabilities[0])[-3:][::-1].tolist()
        onnx_top3 = np.argsort(onnx_probabilities[0])[-3:][::-1].tolist()
        top3_matches += int(torch_top3 == onnx_top3)
        probability_sum_errors.append(abs(float(onnx_probabilities.sum()) - 1.0))

    benchmark_input = inputs[0].numpy()
    for _ in range(warmup):
        session.run(None, {input_name: benchmark_input})
    timings: list[float] = []
    for _ in range(samples):
        started = time.perf_counter()
        session.run(None, {input_name: benchmark_input})
        timings.append((time.perf_counter() - started) * 1000)
    return {
        "inputCount": len(inputs),
        "inputMode": "fixture" if fixtures else "synthetic",
        "outputShape": list(session.get_outputs()[0].shape),
        "top1MatchRate": top1_matches / len(inputs),
        "top3ExactOrderMatchRate": top3_matches / len(inputs),
        "maxAbsoluteLogitError": maximum_error,
        "maxProbabilitySumError": max(probability_sum_errors),
        "artifactBytes": {"pytorch": model_path.stat().st_size, "onnx": onnx_path.stat().st_size},
        "onnxRuntimeCpu": {
            "coldLoadMs": cold_load_ms,
            "warmMedianMs": median(timings),
            "warmP95Ms": percentile(timings, 95),
            "samples": samples,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Check ONNX parity and CPU latency")
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--onnx", type=Path, required=True)
    parser.add_argument("--fixture", type=Path, action="append", default=[])
    parser.add_argument("--warmup", type=int, default=5)
    parser.add_argument("--samples", type=int, default=30)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.warmup < 0 or args.samples < 1:
        parser.error("--warmup must be non-negative and --samples must be positive")
    result = evaluate(
        args.model,
        args.metadata,
        args.onnx,
        args.fixture,
        args.warmup,
        args.samples,
    )
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
