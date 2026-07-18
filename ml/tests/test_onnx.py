from __future__ import annotations

import json
from pathlib import Path

import pytest
import torch

pytest.importorskip("onnx")
pytest.importorskip("onnxruntime")

from export_onnx import export_model  # noqa: E402
from modeling import build_metadata, build_model  # noqa: E402
from onnx_evaluate import evaluate  # noqa: E402


def test_temporary_artifact_exports_and_matches_onnx_runtime(tmp_path: Path) -> None:
    model = build_model(pretrained=False)
    model_path = tmp_path / "model.pt"
    metadata_path = tmp_path / "metadata.json"
    onnx_path = tmp_path / "model.onnx"
    torch.save(model.state_dict(), model_path)
    metadata_path.write_text(json.dumps(build_metadata("onnx-smoke-001")), encoding="utf-8")

    export_model(model_path, metadata_path, onnx_path, opset=17)
    result = evaluate(model_path, metadata_path, onnx_path, [], warmup=1, samples=2)

    assert result["top1MatchRate"] == 1
    assert result["top3ExactOrderMatchRate"] == 1
    assert result["maxAbsoluteLogitError"] < 1e-4
