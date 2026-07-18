from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from dataset import (
    EXPECTED_CLASSES,
    detect_layout,
    discover_splits,
    duplicate_hashes,
    find_corrupt,
    relative_manifest,
    summarize,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a Garbage Classification V2 dataset")
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--check-corrupt", action="store_true")
    parser.add_argument("--manifest-out", type=Path)
    args = parser.parse_args()
    if args.data_dir is None:
        configured = os.getenv("GARBAGE_DATASET_DIR")
        if not configured:
            parser.error("--data-dir or GARBAGE_DATASET_DIR is required")
        args.data_dir = Path(configured)
    return args


def build_report(data_dir: Path, seed: int, check_corrupt: bool) -> dict[str, object]:
    root = data_dir.resolve()
    layout = detect_layout(root)
    splits = discover_splits(root, seed)
    all_records = [record for records in splits.values() for record in records]
    corrupt = find_corrupt(all_records) if check_corrupt else []
    duplicates = duplicate_hashes(all_records, root)
    warnings: list[str] = []
    if duplicates:
        warnings.append(
            f"Found {len(duplicates)} duplicate content hash group(s); review split leakage."
        )
    if not check_corrupt:
        warnings.append("Corrupt-image scan was not requested; rerun with --check-corrupt.")
    return {
        "datasetRoot": str(root),
        "layout": layout,
        "canonicalClassOrder": list(EXPECTED_CLASSES),
        "classes": {
            class_name: sum(split_counts[class_name] for split_counts in summarize(splits).values())
            for class_name in EXPECTED_CLASSES
        },
        "splits": summarize(splits),
        "corruptFiles": [path.resolve().relative_to(root).as_posix() for path in corrupt],
        "duplicateHashes": duplicates,
        "warnings": warnings,
        "manifest": relative_manifest(splits, root),
    }


def main() -> None:
    args = parse_args()
    report = build_report(args.data_dir, args.seed, args.check_corrupt)
    if args.manifest_out:
        args.manifest_out.parent.mkdir(parents=True, exist_ok=True)
        args.manifest_out.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    summary = {key: value for key, value in report.items() if key != "manifest"}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if report["corruptFiles"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
