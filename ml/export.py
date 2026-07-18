from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from modeling import build_metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.checkpoint, args.output_dir / "garbage_classifier.pt")
    metadata = build_metadata(args.version)
    (args.output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
