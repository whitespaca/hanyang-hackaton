from __future__ import annotations

import hashlib
import random
from collections import Counter, defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from torch import Tensor
from torch.utils.data import Dataset

EXPECTED_CLASSES = (
    "metal",
    "glass",
    "biological",
    "paper",
    "battery",
    "trash",
    "cardboard",
    "shoes",
    "clothes",
    "plastic",
)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
SPLIT_ALIASES = {
    "train": {"train"},
    "val": {"val", "valid", "validation"},
    "test": {"test"},
}


@dataclass(frozen=True)
class ImageRecord:
    path: Path
    class_name: str
    class_index: int


class GarbageDataset(Dataset[tuple[Tensor, int]]):
    def __init__(
        self, records: list[ImageRecord], transform: Callable[[Image.Image], Tensor]
    ) -> None:
        self.records = records
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[Tensor, int]:
        record = self.records[index]
        with Image.open(record.path) as source:
            image = source.convert("RGB")
        return self.transform(image), record.class_index


def _resolve_named_directories(
    root: Path, expected_names: set[str], *, kind: str
) -> dict[str, Path]:
    if not root.is_dir():
        raise ValueError(f"{kind} root does not exist or is not a directory: {root}")

    resolved: dict[str, Path] = {}
    unexpected: list[str] = []
    directories = sorted(
        (path for path in root.iterdir() if path.is_dir()), key=lambda path: path.name
    )
    for directory in directories:
        normalized = directory.name.casefold()
        if normalized not in expected_names:
            unexpected.append(directory.name)
            continue
        if normalized in resolved:
            raise ValueError(
                f"Duplicate {kind} after case normalization: "
                f"{resolved[normalized].name!r}, {directory.name!r}"
            )
        resolved[normalized] = directory

    missing = sorted(expected_names - set(resolved))
    if missing or unexpected:
        raise ValueError(f"Invalid {kind} directories: missing={missing}, extra={unexpected}")
    return resolved


def scan_class_root(root: Path) -> list[ImageRecord]:
    class_directories = _resolve_named_directories(root, set(EXPECTED_CLASSES), kind="class")
    records: list[ImageRecord] = []
    empty_classes: list[str] = []
    for index, class_name in enumerate(EXPECTED_CLASSES):
        class_records = [
            ImageRecord(path=path, class_name=class_name, class_index=index)
            for path in sorted(class_directories[class_name].rglob("*"))
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ]
        if not class_records:
            empty_classes.append(class_name)
        records.extend(class_records)
    if empty_classes:
        raise ValueError(f"Classes contain no supported images: {empty_classes}")
    return records


def _discover_split_roots(data_dir: Path) -> dict[str, Path]:
    if not data_dir.is_dir():
        raise ValueError(f"Dataset root does not exist or is not a directory: {data_dir}")

    candidates: dict[str, Path] = {}
    recognized_aliases = set().union(*SPLIT_ALIASES.values())
    directories = sorted(
        (path for path in data_dir.iterdir() if path.is_dir()), key=lambda path: path.name
    )
    for directory in directories:
        normalized = directory.name.casefold()
        if normalized not in recognized_aliases:
            continue
        split = next(name for name, aliases in SPLIT_ALIASES.items() if normalized in aliases)
        if split in candidates:
            raise ValueError(
                f"Duplicate {split} split after case normalization: "
                f"{candidates[split].name!r}, {directory.name!r}"
            )
        candidates[split] = directory
    return candidates


def discover_splits(data_dir: Path, seed: int = 42) -> dict[str, list[ImageRecord]]:
    resolved = _discover_split_roots(data_dir)
    if resolved:
        if set(resolved) != {"train", "val", "test"}:
            raise ValueError(
                "Pre-split datasets must include train, validation (or val/valid), and test"
            )
        return {name: scan_class_root(path) for name, path in resolved.items()}
    return stratified_split(scan_class_root(data_dir), seed)


def detect_layout(data_dir: Path) -> str:
    return "pre_split" if _discover_split_roots(data_dir) else "stratified"


def stratified_split(records: list[ImageRecord], seed: int) -> dict[str, list[ImageRecord]]:
    grouped: dict[int, list[ImageRecord]] = defaultdict(list)
    for record in records:
        grouped[record.class_index].append(record)
    result: dict[str, list[ImageRecord]] = {"train": [], "val": [], "test": []}
    randomizer = random.Random(seed)
    for class_index in range(len(EXPECTED_CLASSES)):
        class_records = list(grouped[class_index])
        count = len(class_records)
        if count < 3:
            raise ValueError(
                "Each class needs at least 3 images for a stratified train/validation/test split"
            )
        randomizer.shuffle(class_records)
        val_count = max(1, round(count * 0.1))
        test_count = max(1, round(count * 0.1))
        if val_count + test_count >= count:
            raise ValueError(
                f"Class {EXPECTED_CLASSES[class_index]!r} has too few images for an 80/10/10 split"
            )
        result["val"].extend(class_records[:val_count])
        result["test"].extend(class_records[val_count : val_count + test_count])
        result["train"].extend(class_records[val_count + test_count :])
    return result


def summarize(splits: dict[str, list[ImageRecord]]) -> dict[str, dict[str, int]]:
    return {
        split: {
            class_name: Counter(record.class_name for record in records)[class_name]
            for class_name in EXPECTED_CLASSES
        }
        for split, records in splits.items()
    }


def relative_manifest(
    splits: dict[str, list[ImageRecord]], dataset_root: Path
) -> dict[str, list[dict[str, str]]]:
    return {
        split: [
            {
                "path": record.path.resolve().relative_to(dataset_root.resolve()).as_posix(),
                "className": record.class_name,
            }
            for record in sorted(records, key=lambda item: str(item.path))
        ]
        for split, records in splits.items()
    }


def find_corrupt(records: list[ImageRecord]) -> list[Path]:
    corrupt: list[Path] = []
    for record in records:
        try:
            with Image.open(record.path) as image:
                image.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            corrupt.append(record.path)
    return corrupt


def duplicate_hashes(records: list[ImageRecord], root: Path | None = None) -> dict[str, list[str]]:
    hashes: dict[str, list[str]] = defaultdict(list)
    for record in records:
        digest = hashlib.sha256(record.path.read_bytes()).hexdigest()
        display_path = record.path.resolve()
        if root is not None:
            display_path = display_path.relative_to(root.resolve())
        hashes[digest].append(display_path.as_posix())
    return {digest: paths for digest, paths in hashes.items() if len(paths) > 1}
