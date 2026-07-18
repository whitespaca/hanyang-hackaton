from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from dataset import EXPECTED_CLASSES, detect_layout, discover_splits, relative_manifest
from preflight import build_report


def write_image(path: Path, color: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (32, 32), (color, color, color)).save(path)


def make_single_root(root: Path, images_per_class: int = 3) -> None:
    for class_index, class_name in enumerate(EXPECTED_CLASSES):
        directory_name = class_name.title()
        for image_index in range(images_per_class):
            write_image(
                root / directory_name / f"{image_index}.png",
                (class_index * 20 + image_index) % 255,
            )


def test_case_insensitive_class_names_and_reproducible_stratified_split(
    tmp_path: Path,
) -> None:
    make_single_root(tmp_path, images_per_class=10)

    first = discover_splits(tmp_path, seed=42)
    second = discover_splits(tmp_path, seed=42)

    assert detect_layout(tmp_path) == "stratified"
    assert {name: len(records) for name, records in first.items()} == {
        "train": 80,
        "val": 10,
        "test": 10,
    }
    assert relative_manifest(first, tmp_path) == relative_manifest(second, tmp_path)
    train_manifest = relative_manifest(first, tmp_path)["train"]
    assert all(not Path(item["path"]).is_absolute() for item in train_manifest)


def test_case_insensitive_pre_split_layout(tmp_path: Path) -> None:
    split_names = {"train": "Train", "val": "Validation", "test": "Test"}
    for split_name in split_names.values():
        for class_index, class_name in enumerate(EXPECTED_CLASSES):
            write_image(
                tmp_path / split_name / class_name.title() / "sample.png",
                class_index,
            )

    splits = discover_splits(tmp_path)

    assert detect_layout(tmp_path) == "pre_split"
    assert all(len(records) == 10 for records in splits.values())


def test_duplicate_normalized_class_names_are_rejected(tmp_path: Path) -> None:
    make_single_root(tmp_path)
    if (tmp_path / "Metal").resolve() == (tmp_path / "metal").resolve():
        pytest.skip("The active filesystem is case-insensitive")
    write_image(tmp_path / "metal" / "duplicate.png", 1)

    with pytest.raises(ValueError, match="Duplicate class"):
        discover_splits(tmp_path)


def test_empty_class_is_rejected(tmp_path: Path) -> None:
    make_single_root(tmp_path)
    for image in (tmp_path / "Plastic").glob("*.png"):
        image.unlink()

    with pytest.raises(ValueError, match="contain no supported images"):
        discover_splits(tmp_path)


def test_preflight_reports_real_counts_and_relative_manifest(tmp_path: Path) -> None:
    make_single_root(tmp_path, images_per_class=3)

    report = build_report(tmp_path, seed=42, check_corrupt=True)

    assert report["layout"] == "stratified"
    assert report["classes"] == {class_name: 3 for class_name in EXPECTED_CLASSES}
    assert report["corruptFiles"] == []
    manifest = report["manifest"]
    assert isinstance(manifest, dict)
    assert all(not Path(entry["path"]).is_absolute() for entry in manifest["train"])
