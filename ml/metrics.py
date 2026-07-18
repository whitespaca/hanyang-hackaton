from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from torch.utils.data import DataLoader


@dataclass
class Evaluation:
    loss: float
    accuracy: float
    macro_f1: float
    top3_accuracy: float
    report: dict[str, object]
    confusion: list[list[int]]


def evaluate_loader(
    model: torch.nn.Module,
    loader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    criterion: torch.nn.Module,
    classes: tuple[str, ...],
    device: torch.device,
) -> Evaluation:
    model.eval()
    losses: list[float] = []
    targets: list[int] = []
    predictions: list[int] = []
    top3_hits = 0
    with torch.inference_mode():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            losses.append(float(criterion(logits, labels)))
            predictions.extend(logits.argmax(1).cpu().tolist())
            targets.extend(labels.cpu().tolist())
            top3_hits += int(
                (logits.topk(3, dim=1).indices == labels.unsqueeze(1)).any(dim=1).sum()
            )
    accuracy = float(np.mean(np.array(targets) == np.array(predictions)))
    return Evaluation(
        loss=float(np.mean(losses)),
        accuracy=accuracy,
        macro_f1=float(f1_score(targets, predictions, average="macro", zero_division=0)),
        top3_accuracy=top3_hits / len(targets),
        report=classification_report(
            targets, predictions, target_names=classes, output_dict=True, zero_division=0
        ),
        confusion=confusion_matrix(targets, predictions, labels=list(range(len(classes)))).tolist(),
    )
