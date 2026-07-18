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


def scan_class_root(root: Path) -> list[ImageRecord]:
    directories = sorted(path.name for path in root.iterdir() if path.is_dir())
    if set(directories) != set(EXPECTED_CLASSES):
        missing = sorted(set(EXPECTED_CLASSES) - set(directories))
        extra = sorted(set(directories) - set(EXPECTED_CLASSES))
        raise ValueError(
            f"클래스 폴더 불일치: missing={missing}, extra={extra}. 명시적 이름 정리가 필요합니다."
        )
    records: list[ImageRecord] = []
    for index, class_name in enumerate(EXPECTED_CLASSES):
        records.extend(
            ImageRecord(path=path, class_name=class_name, class_index=index)
            for path in sorted((root / class_name).rglob("*"))
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        )
    if not records:
        raise ValueError(f"이미지 파일이 없습니다: {root}")
    return records


def discover_splits(data_dir: Path, seed: int = 42) -> dict[str, list[ImageRecord]]:
    split_aliases = {"train": ("train",), "val": ("val", "valid", "validation"), "test": ("test",)}
    resolved: dict[str, Path] = {}
    for split, aliases in split_aliases.items():
        candidate = next(
            (data_dir / alias for alias in aliases if (data_dir / alias).is_dir()), None
        )
        if candidate is not None:
            resolved[split] = candidate
    if resolved:
        if set(resolved) != {"train", "val", "test"}:
            raise ValueError(
                "분할 폴더를 사용하려면 train, val(validation), test가 모두 있어야 합니다."
            )
        return {name: scan_class_root(path) for name, path in resolved.items()}
    return stratified_split(scan_class_root(data_dir), seed)


def stratified_split(records: list[ImageRecord], seed: int) -> dict[str, list[ImageRecord]]:
    grouped: dict[int, list[ImageRecord]] = defaultdict(list)
    for record in records:
        grouped[record.class_index].append(record)
    result = {"train": [], "val": [], "test": []}
    randomizer = random.Random(seed)
    for class_records in grouped.values():
        randomizer.shuffle(class_records)
        count = len(class_records)
        val_count = max(1, round(count * 0.1))
        test_count = max(1, round(count * 0.1))
        if count < 3:
            raise ValueError("각 클래스에 stratified split을 위한 이미지가 최소 3개 필요합니다.")
        result["val"].extend(class_records[:val_count])
        result["test"].extend(class_records[val_count : val_count + test_count])
        result["train"].extend(class_records[val_count + test_count :])
    return result


def summarize(splits: dict[str, list[ImageRecord]]) -> dict[str, dict[str, int]]:
    return {
        split: dict(Counter(record.class_name for record in records))
        for split, records in splits.items()
    }


def find_corrupt(records: list[ImageRecord]) -> list[Path]:
    corrupt: list[Path] = []
    for record in records:
        try:
            with Image.open(record.path) as image:
                image.verify()
        except (UnidentifiedImageError, OSError):
            corrupt.append(record.path)
    return corrupt


def duplicate_hashes(records: list[ImageRecord]) -> dict[str, list[str]]:
    hashes: dict[str, list[str]] = defaultdict(list)
    for record in records:
        digest = hashlib.sha256(record.path.read_bytes()).hexdigest()
        hashes[digest].append(str(record.path))
    return {digest: paths for digest, paths in hashes.items() if len(paths) > 1}
