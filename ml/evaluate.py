from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms

from dataset import EXPECTED_CLASSES, GarbageDataset, discover_splits
from metrics import evaluate_loader
from modeling import IMAGENET_MEAN, IMAGENET_STD, build_model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()
    test_records = discover_splits(args.data_dir)["test"]
    transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    loader = DataLoader(GarbageDataset(test_records, transform), batch_size=args.batch_size)
    model = build_model(pretrained=False)
    model.load_state_dict(torch.load(args.model, map_location="cpu", weights_only=True))
    metrics = evaluate_loader(
        model, loader, nn.CrossEntropyLoss(), EXPECTED_CLASSES, torch.device("cpu")
    )
    print(json.dumps(metrics.__dict__, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
