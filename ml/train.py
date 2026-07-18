from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms

from dataset import (
    EXPECTED_CLASSES,
    GarbageDataset,
    discover_splits,
    duplicate_hashes,
    find_corrupt,
    summarize,
)
from metrics import evaluate_loader
from modeling import IMAGENET_MEAN, IMAGENET_STD, build_metadata, build_model


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="분리샷 MobileNetV3 Small 학습")
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--epochs-head", type=int, default=4)
    parser.add_argument("--epochs-finetune", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--check-corrupt", action="store_true")
    return parser.parse_args()


def seed_all(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def make_model(*, pretrained: bool = True) -> nn.Module:
    return build_model(pretrained=pretrained)


def train_phase(
    model: nn.Module,
    loader: DataLoader,
    validation: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    epochs: int,
    device: torch.device,
    best: tuple[float, dict[str, torch.Tensor] | None],
) -> tuple[float, dict[str, torch.Tensor] | None]:
    best_score, best_state = best
    for epoch in range(epochs):
        model.train()
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
        metrics = evaluate_loader(model, validation, criterion, EXPECTED_CLASSES, device)
        print(f"epoch={epoch + 1} val_loss={metrics.loss:.4f} val_macro_f1={metrics.macro_f1:.4f}")
        if metrics.macro_f1 > best_score:
            best_score = metrics.macro_f1
            best_state = {key: value.detach().cpu() for key, value in model.state_dict().items()}
    return best_score, best_state


def main() -> None:
    args = parse_args()
    seed_all(args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    splits = discover_splits(args.data_dir.resolve(), args.seed)
    print(json.dumps(summarize(splits), ensure_ascii=False, indent=2))
    all_records = sum(splits.values(), [])
    duplicates = duplicate_hashes(all_records)
    if duplicates:
        print(f"동일 hash 후보: {len(duplicates)}그룹 (split 누수 여부를 확인하세요)")
    if args.check_corrupt:
        corrupt = find_corrupt(all_records)
        if corrupt:
            raise ValueError(f"손상 이미지 {len(corrupt)}개: {corrupt[:10]}")

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
    eval_transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    loaders = {
        "train": DataLoader(
            GarbageDataset(splits["train"], train_transform),
            batch_size=args.batch_size,
            shuffle=True,
            num_workers=0,
        ),
        "val": DataLoader(
            GarbageDataset(splits["val"], eval_transform), batch_size=args.batch_size, num_workers=0
        ),
        "test": DataLoader(
            GarbageDataset(splits["test"], eval_transform),
            batch_size=args.batch_size,
            num_workers=0,
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
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = make_model().to(device)
    criterion = nn.CrossEntropyLoss(weight=weights.to(device))
    for parameter in model.features.parameters():
        parameter.requires_grad = False
    best = train_phase(
        model,
        loaders["train"],
        loaders["val"],
        criterion,
        torch.optim.AdamW(model.classifier.parameters(), lr=1e-3),
        args.epochs_head,
        device,
        (-1, None),
    )
    for parameter in model.features[-2:].parameters():
        parameter.requires_grad = True
    best = train_phase(
        model,
        loaders["train"],
        loaders["val"],
        criterion,
        torch.optim.AdamW(filter(lambda value: value.requires_grad, model.parameters()), lr=1e-4),
        args.epochs_finetune,
        device,
        best,
    )
    if best[1] is None:
        raise RuntimeError("최적 checkpoint를 만들지 못했습니다.")
    model.load_state_dict(best[1])
    metrics = evaluate_loader(model, loaders["test"], criterion, EXPECTED_CLASSES, device)
    torch.save(best[1], args.output_dir / "garbage_classifier.pt")
    metadata = build_metadata()
    (args.output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (args.output_dir / "metrics.json").write_text(
        json.dumps(metrics.__dict__, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "accuracy": metrics.accuracy,
                "macroF1": metrics.macro_f1,
                "top3Accuracy": metrics.top3_accuracy,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
