from __future__ import annotations

import argparse
import csv
import json
import os
import random
import shutil
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms

from dataset import (
    EXPECTED_CLASSES,
    GarbageDataset,
    detect_layout,
    discover_splits,
    duplicate_hashes,
    find_corrupt,
    relative_manifest,
    summarize,
)
from metrics import Evaluation, evaluate_loader
from modeling import IMAGENET_MEAN, IMAGENET_STD, build_metadata, build_model

REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_NUM_WORKERS = 0 if os.name == "nt" else min(4, os.cpu_count() or 1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Bunrishot MobileNetV3 Small model")
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument(
        "--artifacts-dir", type=Path, default=REPOSITORY_ROOT / "artifacts" / "model"
    )
    parser.add_argument(
        "--results-dir", type=Path, default=REPOSITORY_ROOT / "docs" / "model-results"
    )
    parser.add_argument("--run-id")
    parser.add_argument("--epochs-head", type=int, default=4)
    parser.add_argument("--epochs-finetune", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--head-lr", type=float, default=1e-3)
    parser.add_argument("--finetune-lr", type=float, default=1e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--num-workers", type=int, default=DEFAULT_NUM_WORKERS)
    parser.add_argument("--device", choices=("auto", "cuda", "cpu"), default="auto")
    parser.add_argument(
        "--amp",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Use automatic mixed precision on CUDA (enabled by default)",
    )
    parser.add_argument("--confidence-threshold", type=float, default=0.65)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--check-corrupt", action="store_true")
    args = parser.parse_args()
    if args.data_dir is None:
        configured = os.getenv("GARBAGE_DATASET_DIR")
        if not configured:
            parser.error("--data-dir or GARBAGE_DATASET_DIR is required")
        args.data_dir = Path(configured)
    if args.epochs_head < 1 or args.epochs_finetune < 1:
        parser.error("Both training phases require at least one epoch")
    if args.num_workers < 0:
        parser.error("--num-workers must be zero or greater")
    if not 0 <= args.confidence_threshold <= 1:
        parser.error("--confidence-threshold must be between 0 and 1")
    return args


def seed_all(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def resolve_device(requested: str) -> torch.device:
    if requested == "cpu":
        return torch.device("cpu")
    if torch.cuda.is_available():
        return torch.device("cuda")
    if requested == "cuda":
        raise RuntimeError(
            "CUDA was requested but this PyTorch installation cannot use it. "
            f"torch={torch.__version__}, torch.version.cuda={torch.version.cuda!r}. "
            "Run `uv sync` in ml/ to install the configured CUDA build, then verify "
            '`uv run python -c "import torch; print(torch.cuda.is_available())"`.'
        )
    return torch.device("cpu")


def device_summary(device: torch.device, amp_requested: bool) -> dict[str, object]:
    is_cuda = device.type == "cuda"
    return {
        "device": str(device),
        "deviceName": torch.cuda.get_device_name(device) if is_cuda else "CPU",
        "torchVersion": torch.__version__,
        "cudaBuild": torch.version.cuda,
        "cudaAvailable": torch.cuda.is_available(),
        "amp": amp_requested and is_cuda,
    }


def make_model(*, pretrained: bool = True) -> nn.Module:
    return build_model(pretrained=pretrained)


def build_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.75, 1)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(0.1, 0.1, 0.08),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    evaluation_transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    return train_transform, evaluation_transform


def train_phase(
    model: nn.Module,
    loader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    validation: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    epochs: int,
    device: torch.device,
    best: tuple[float, dict[str, torch.Tensor] | None],
    phase_name: str,
    confidence_threshold: float,
    amp_enabled: bool,
) -> tuple[tuple[float, dict[str, torch.Tensor] | None], list[dict[str, Any]]]:
    best_score, best_state = best
    history: list[dict[str, Any]] = []
    scaler = torch.amp.GradScaler("cuda", enabled=amp_enabled)
    for epoch in range(epochs):
        model.train()
        training_loss = torch.zeros((), device=device)
        batch_count = 0
        for images, labels in loader:
            images = images.to(device, non_blocking=device.type == "cuda")
            labels = labels.to(device, non_blocking=device.type == "cuda")
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(
                device_type=device.type,
                dtype=torch.float16,
                enabled=amp_enabled,
            ):
                loss = criterion(model(images), labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            training_loss += loss.detach()
            batch_count += 1
        metrics = evaluate_loader(
            model,
            validation,
            criterion,
            EXPECTED_CLASSES,
            device,
            confidence_threshold,
            amp_enabled=amp_enabled,
        )
        entry = {
            "phase": phase_name,
            "epoch": epoch + 1,
            "trainLoss": float((training_loss / batch_count).cpu()),
            "validation": metrics.to_dict(),
        }
        history.append(entry)
        print(
            f"phase={phase_name} epoch={epoch + 1} "
            f"val_loss={metrics.loss:.4f} val_macro_f1={metrics.macro_f1:.4f}"
        )
        if metrics.macro_f1 > best_score:
            best_score = metrics.macro_f1
            best_state = {
                key: value.detach().cpu().clone() for key, value in model.state_dict().items()
            }
    return (best_score, best_state), history


def _write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_evaluation_artifacts(directory: Path, metrics: Evaluation) -> None:
    _write_json(directory / "metrics.json", metrics.to_dict())
    _write_json(directory / "classification-report.json", metrics.report)
    with (directory / "confusion-matrix.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["actual/predicted", *EXPECTED_CLASSES])
        for class_name, row in zip(EXPECTED_CLASSES, metrics.confusion, strict=True):
            writer.writerow([class_name, *row])

    figure, axis = plt.subplots(figsize=(10, 8))
    image = axis.imshow(metrics.confusion, cmap="Blues")
    figure.colorbar(image, ax=axis)
    axis.set(
        xticks=range(len(EXPECTED_CLASSES)),
        yticks=range(len(EXPECTED_CLASSES)),
        xticklabels=EXPECTED_CLASSES,
        yticklabels=EXPECTED_CLASSES,
        xlabel="Predicted",
        ylabel="Actual",
        title="Garbage Classification V2 confusion matrix",
    )
    plt.setp(axis.get_xticklabels(), rotation=45, ha="right")
    figure.tight_layout()
    figure.savefig(directory / "confusion-matrix.png", dpi=160)
    plt.close(figure)


def main() -> None:
    args = parse_args()
    seed_all(args.seed)
    device = resolve_device(args.device)
    amp_enabled = args.amp and device.type == "cuda"
    runtime = device_summary(device, args.amp)
    runtime["numWorkers"] = args.num_workers
    print(json.dumps({"trainingRuntime": runtime}, indent=2))
    if args.device == "auto" and device.type == "cpu":
        print(
            "warning: CUDA is unavailable; training will use CPU. "
            "Use --device cuda to require GPU and fail fast."
        )
    if os.name == "nt" and args.num_workers > 0:
        print(
            "warning: DataLoader worker processes on Windows each import PyTorch. "
            "Use --num-workers 0 if CUDA DLL loading fails with WinError 1455."
        )
    dataset_root = args.data_dir.resolve()
    splits = discover_splits(dataset_root, args.seed)
    distribution = summarize(splits)
    print(json.dumps(distribution, ensure_ascii=False, indent=2))
    all_records = [record for records in splits.values() for record in records]
    duplicates = duplicate_hashes(all_records, dataset_root)
    if duplicates:
        print(
            f"warning: found {len(duplicates)} duplicate content hash group(s); "
            "review split leakage"
        )
    if args.check_corrupt:
        corrupt = find_corrupt(all_records)
        if corrupt:
            relative = [
                path.resolve().relative_to(dataset_root).as_posix() for path in corrupt[:10]
            ]
            raise ValueError(f"Found {len(corrupt)} corrupt images: {relative}")

    train_transform, evaluation_transform = build_transforms()
    loader_options: dict[str, object] = {
        "num_workers": args.num_workers,
        "pin_memory": device.type == "cuda",
        "persistent_workers": args.num_workers > 0,
    }
    loaders: dict[str, DataLoader[tuple[torch.Tensor, torch.Tensor]]] = {
        "train": DataLoader(
            GarbageDataset(splits["train"], train_transform),
            batch_size=args.batch_size,
            shuffle=True,
            **loader_options,
        ),
        "val": DataLoader(
            GarbageDataset(splits["val"], evaluation_transform),
            batch_size=args.batch_size,
            **loader_options,
        ),
        "test": DataLoader(
            GarbageDataset(splits["test"], evaluation_transform),
            batch_size=args.batch_size,
            **loader_options,
        ),
    }
    counts = Counter(record.class_index for record in splits["train"])
    weights = torch.tensor(
        [
            len(splits["train"]) / (len(EXPECTED_CLASSES) * counts[index])
            for index in range(len(EXPECTED_CLASSES))
        ],
        dtype=torch.float32,
    )
    model = make_model().to(device)
    criterion = nn.CrossEntropyLoss(weight=weights.to(device))
    for parameter in model.features.parameters():
        parameter.requires_grad = False

    best: tuple[float, dict[str, torch.Tensor] | None] = (-1, None)
    best, head_history = train_phase(
        model,
        loaders["train"],
        loaders["val"],
        criterion,
        torch.optim.AdamW(
            model.classifier.parameters(), lr=args.head_lr, weight_decay=args.weight_decay
        ),
        args.epochs_head,
        device,
        best,
        "head",
        args.confidence_threshold,
        amp_enabled,
    )
    for parameter in model.features[-2:].parameters():
        parameter.requires_grad = True
    best, finetune_history = train_phase(
        model,
        loaders["train"],
        loaders["val"],
        criterion,
        torch.optim.AdamW(
            (value for value in model.parameters() if value.requires_grad),
            lr=args.finetune_lr,
            weight_decay=args.weight_decay,
        ),
        args.epochs_finetune,
        device,
        best,
        "finetune",
        args.confidence_threshold,
        amp_enabled,
    )
    if best[1] is None:
        raise RuntimeError("Training did not produce a validation checkpoint")
    model.load_state_dict(best[1])
    metrics = evaluate_loader(
        model,
        loaders["test"],
        criterion,
        EXPECTED_CLASSES,
        device,
        args.confidence_threshold,
        amp_enabled=amp_enabled,
    )

    run_id = args.run_id or f"gcv2-mobilenetv3s-{datetime.now(UTC).strftime('%Y%m%d-%H%M')}"
    artifact_dir = args.artifacts_dir.resolve() / run_id
    artifact_dir.mkdir(parents=True, exist_ok=False)
    runtime_dir = args.output_dir.resolve()
    runtime_dir.mkdir(parents=True, exist_ok=True)
    results_dir = args.results_dir.resolve()
    results_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifact_dir / "garbage_classifier.pt"
    torch.save(best[1], model_path)
    metadata = build_metadata(run_id)
    metadata["confidenceThreshold"] = args.confidence_threshold
    _write_json(artifact_dir / "metadata.json", metadata)
    write_evaluation_artifacts(artifact_dir, metrics)
    _write_json(artifact_dir / "dataset-manifest.json", relative_manifest(splits, dataset_root))
    _write_json(artifact_dir / "class-distribution.json", distribution)
    _write_json(artifact_dir / "training-history.json", head_history + finetune_history)
    training_config = {
        "model": "mobilenet_v3_small",
        "pretrainedWeights": "ImageNet",
        "inputSize": [224, 224],
        "seed": args.seed,
        "batchSize": args.batch_size,
        "epochsHead": args.epochs_head,
        "epochsFinetune": args.epochs_finetune,
        "headLearningRate": args.head_lr,
        "finetuneLearningRate": args.finetune_lr,
        "weightDecay": args.weight_decay,
        "classImbalance": {
            "method": "weighted_cross_entropy",
            "formula": "N / (class_count * number_of_classes)",
            "weights": {
                EXPECTED_CLASSES[index]: float(weight) for index, weight in enumerate(weights)
            },
        },
        "selectionMetric": "validation_macro_f1",
        "datasetLayout": detect_layout(dataset_root),
        "device": str(device),
        "deviceName": torch.cuda.get_device_name(device) if device.type == "cuda" else "CPU",
        "torchVersion": torch.__version__,
        "cudaBuild": torch.version.cuda,
        "automaticMixedPrecision": amp_enabled,
        "numWorkers": args.num_workers,
    }
    _write_json(artifact_dir / "training-config.json", training_config)
    (artifact_dir / "README.md").write_text(
        "# Model artifact\n\n"
        f"- Version: `{run_id}`\n"
        "- Selection: best validation macro F1\n"
        "- Test metrics: `metrics.json`\n"
        "- Runtime files: `garbage_classifier.pt`, `metadata.json`\n",
        encoding="utf-8",
    )

    shutil.copy2(model_path, runtime_dir / "garbage_classifier.pt")
    shutil.copy2(artifact_dir / "metadata.json", runtime_dir / "metadata.json")
    for filename in (
        "metrics.json",
        "classification-report.json",
        "confusion-matrix.png",
        "class-distribution.json",
    ):
        shutil.copy2(artifact_dir / filename, results_dir / filename)
    print(json.dumps(metrics.to_dict(), ensure_ascii=False, indent=2))
    print(f"artifact={artifact_dir}")
    print(f"runtime_model={runtime_dir / 'garbage_classifier.pt'}")


if __name__ == "__main__":
    main()
