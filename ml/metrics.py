from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from torch.utils.data import DataLoader


@dataclass
class Evaluation:
    loss: float
    accuracy: float
    macro_f1: float
    weighted_f1: float
    top3_accuracy: float
    low_confidence_rate: float
    per_class_accuracy: dict[str, float]
    report: dict[str, object]
    confusion: list[list[int]]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def evaluate_loader(
    model: torch.nn.Module,
    loader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    criterion: torch.nn.Module,
    classes: tuple[str, ...],
    device: torch.device,
    confidence_threshold: float = 0.65,
    *,
    amp_enabled: bool = False,
) -> Evaluation:
    model.eval()
    losses: list[float] = []
    targets: list[int] = []
    predictions: list[int] = []
    confidences: list[float] = []
    top3_hits = 0
    loss_sum = torch.zeros((), device=device)
    batch_count = 0
    with torch.inference_mode():
        for images, labels in loader:
            images = images.to(device, non_blocking=device.type == "cuda")
            labels = labels.to(device, non_blocking=device.type == "cuda")
            with torch.autocast(
                device_type=device.type,
                dtype=torch.float16,
                enabled=amp_enabled,
            ):
                logits = model(images)
                loss = criterion(logits, labels)
            probabilities = torch.softmax(logits, dim=1)
            loss_sum += loss
            batch_count += 1
            predictions.extend(logits.argmax(1).cpu().tolist())
            targets.extend(labels.cpu().tolist())
            confidences.extend(probabilities.max(1).values.cpu().tolist())
            top3_hits += int(
                (logits.topk(3, dim=1).indices == labels.unsqueeze(1)).any(dim=1).sum()
            )
    if not targets:
        raise ValueError("Evaluation loader produced no samples")
    losses.append(float((loss_sum / batch_count).cpu()))
    confusion = confusion_matrix(targets, predictions, labels=list(range(len(classes))))
    per_class_accuracy = {
        class_name: float(confusion[index, index] / confusion[index].sum())
        if confusion[index].sum()
        else 0.0
        for index, class_name in enumerate(classes)
    }
    return Evaluation(
        loss=float(np.mean(losses)),
        accuracy=float(np.mean(np.array(targets) == np.array(predictions))),
        macro_f1=float(f1_score(targets, predictions, average="macro", zero_division=0)),
        weighted_f1=float(f1_score(targets, predictions, average="weighted", zero_division=0)),
        top3_accuracy=top3_hits / len(targets),
        low_confidence_rate=float(np.mean(np.array(confidences) < confidence_threshold)),
        per_class_accuracy=per_class_accuracy,
        report=classification_report(
            targets,
            predictions,
            labels=list(range(len(classes))),
            target_names=classes,
            output_dict=True,
            zero_division=0,
        ),
        confusion=confusion.tolist(),
    )
