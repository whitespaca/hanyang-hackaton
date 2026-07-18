from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
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
RESULT_FILES = (
    "metrics.json",
    "classification-report.json",
    "class-distribution.json",
    "confusion-matrix.png",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Package a verified Bunrishot model release"
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=REPOSITORY_ROOT / "docs" / "model-results",
    )
    parser.add_argument("--source-commit")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def read_json(path: Path) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot read valid JSON from {path}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_commit(configured: str | None) -> str:
    if configured:
        return configured
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPOSITORY_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def validate_metadata(metadata: dict[str, object]) -> None:
    if metadata.get("modelName") != "mobilenet_v3_small":
        raise ValueError("metadata modelName must be mobilenet_v3_small")
    version = metadata.get("modelVersion")
    if not isinstance(version, str) or not version:
        raise ValueError("metadata modelVersion must be a non-empty string")
    if metadata.get("classes") != list(EXPECTED_CLASSES):
        raise ValueError("metadata classes must match the canonical class order")
    if metadata.get("inputSize") != [224, 224]:
        raise ValueError("metadata inputSize must be [224, 224]")
    normalization = metadata.get("normalization")
    if not isinstance(normalization, dict):
        raise ValueError("metadata normalization is required")
    if normalization.get("mean") != [0.485, 0.456, 0.406]:
        raise ValueError("metadata normalization mean does not match ImageNet")
    if normalization.get("std") != [0.229, 0.224, 0.225]:
        raise ValueError("metadata normalization std does not match ImageNet")


def validate_metrics(metrics: dict[str, object], report: dict[str, object]) -> int:
    required = ("accuracy", "macro_f1", "weighted_f1", "top3_accuracy")
    for key in required:
        value = metrics.get(key)
        if not isinstance(value, (int, float)) or not 0 <= value <= 1:
            raise ValueError(f"metrics {key} must be between 0 and 1")
    macro_average = report.get("macro avg")
    if not isinstance(macro_average, dict):
        raise ValueError("classification report macro avg is required")
    support = macro_average.get("support")
    if not isinstance(support, (int, float)) or support <= 0:
        raise ValueError("classification report support must be positive")
    return int(support)


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def write_readme(
    path: Path,
    model_version: str,
    metrics: dict[str, object],
    commit: str,
) -> None:
    path.write_text(
        "# Bunrishot model release\n\n"
        f"- Model version: `{model_version}`\n"
        "- Architecture: `mobilenet_v3_small`\n"
        f"- Source commit: `{commit}`\n"
        f"- Test accuracy: `{metrics['accuracy']}`\n"
        f"- Test macro F1: `{metrics['macro_f1']}`\n"
        f"- Test Top-3 accuracy: `{metrics['top3_accuracy']}`\n\n"
        "Dataset source: Kaggle `sumn2u/garbage-classification-v2`. "
        "Review the dataset license before redistributing this derived model.\n\n"
        "Verify every payload with `checksums.sha256` before mounting "
        "`garbage_classifier.pt` and `metadata.json` together at `/app/models`.\n",
        encoding="utf-8",
    )


def verify_zip(zip_path: Path, checksums: dict[str, str]) -> None:
    with zipfile.ZipFile(zip_path) as archive:
        members = archive.namelist()
        expected = sorted([*checksums, "checksums.sha256"])
        if sorted(members) != expected:
            raise ValueError("ZIP members do not match the release payload")
        for name in members:
            member = PurePosixPath(name)
            if member.is_absolute() or ".." in member.parts or len(member.parts) != 1:
                raise ValueError(f"Unsafe ZIP member: {name}")
        for name, expected_hash in checksums.items():
            actual_hash = hashlib.sha256(archive.read(name)).hexdigest()
            if actual_hash != expected_hash:
                raise ValueError(f"ZIP checksum mismatch for {name}")


def package_release(args: argparse.Namespace) -> tuple[Path, Path, dict[str, object]]:
    model = args.model.resolve()
    metadata_path = args.metadata.resolve()
    results_dir = args.results_dir.resolve()
    output = args.output.resolve()
    zip_path = output.with_suffix(".zip")
    for required in (
        model,
        metadata_path,
        *(results_dir / name for name in RESULT_FILES),
    ):
        if not required.is_file():
            raise FileNotFoundError(f"Required release input is missing: {required}")

    metadata = read_json(metadata_path)
    validate_metadata(metadata)
    metrics = read_json(results_dir / "metrics.json")
    report = read_json(results_dir / "classification-report.json")
    test_samples = validate_metrics(metrics, report)
    version = str(metadata["modelVersion"])
    if output.name != version:
        raise ValueError(f"Output directory name must match modelVersion {version!r}")
    if (output.exists() or zip_path.exists()) and not args.force:
        raise FileExistsError(
            "Release output already exists; pass --force to replace it"
        )

    commit = source_commit(args.source_commit)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix=f".{version}-", dir=output.parent
    ) as temporary:
        staging = Path(temporary)
        shutil.copy2(model, staging / "garbage_classifier.pt")
        shutil.copy2(metadata_path, staging / "metadata.json")
        for name in RESULT_FILES:
            shutil.copy2(results_dir / name, staging / name)
        write_readme(staging / "README.md", version, metrics, commit)

        payload_hashes = {
            path.name: sha256(path)
            for path in sorted(staging.iterdir(), key=lambda item: item.name)
            if path.is_file()
        }
        manifest = {
            "modelVersion": version,
            "architecture": metadata["modelName"],
            "classCount": len(EXPECTED_CLASSES),
            "classes": list(EXPECTED_CLASSES),
            "inputSize": metadata["inputSize"],
            "modelFile": "garbage_classifier.pt",
            "metadataFile": "metadata.json",
            "sha256": payload_hashes,
            "metrics": {
                "testSamples": test_samples,
                "accuracy": metrics["accuracy"],
                "macroF1": metrics["macro_f1"],
                "weightedF1": metrics["weighted_f1"],
                "top3Accuracy": metrics["top3_accuracy"],
                "lowConfidenceRate": metrics.get("low_confidence_rate"),
            },
            "sourceCommit": commit,
            "createdAt": datetime.now(UTC).isoformat(),
        }
        write_json(staging / "release-manifest.json", manifest)
        checksums = {
            path.name: sha256(path)
            for path in sorted(staging.iterdir(), key=lambda item: item.name)
            if path.is_file()
        }
        (staging / "checksums.sha256").write_text(
            "".join(f"{digest}  {name}\n" for name, digest in checksums.items()),
            encoding="utf-8",
        )

        if output.exists():
            shutil.rmtree(output)
        if zip_path.exists():
            zip_path.unlink()
        shutil.copytree(staging, output)
        with zipfile.ZipFile(
            zip_path, "w", compression=zipfile.ZIP_DEFLATED
        ) as archive:
            for path in sorted(output.iterdir(), key=lambda item: item.name):
                archive.write(path, arcname=path.name)

    for name, expected_hash in checksums.items():
        if sha256(output / name) != expected_hash:
            raise ValueError(f"Release checksum mismatch for {name}")
    verify_zip(zip_path, checksums)
    return output, zip_path, manifest


def main() -> None:
    output, zip_path, manifest = package_release(parse_args())
    print(
        json.dumps(
            {
                "modelVersion": manifest["modelVersion"],
                "output": str(output),
                "zip": str(zip_path),
                "modelSha256": manifest["sha256"]["garbage_classifier.pt"],
                "verified": True,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
