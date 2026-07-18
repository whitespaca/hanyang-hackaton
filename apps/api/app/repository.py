from __future__ import annotations

import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.errors import AppError, NotFoundError


class SQLiteRepository:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._lock = threading.Lock()

    def initialize(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS classifications (
                    id TEXT PRIMARY KEY,
                    client TEXT NOT NULL,
                    predicted_class TEXT NOT NULL,
                    top_confidence REAL NOT NULL,
                    model_version TEXT NOT NULL,
                    inference_mode TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS feedback (
                    id TEXT PRIMARY KEY,
                    classification_id TEXT NOT NULL UNIQUE,
                    predicted_class TEXT NOT NULL,
                    selected_class TEXT NOT NULL,
                    subcategory TEXT,
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(classification_id) REFERENCES classifications(id)
                );
                """
            )

    def close(self) -> None:
        self._connection.close()

    def create_classification(
        self,
        *,
        client: str,
        predicted_class: str,
        top_confidence: float,
        model_version: str,
        inference_mode: str,
    ) -> str:
        classification_id = str(uuid4())
        created_at = datetime.now(UTC).isoformat()
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO classifications VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    classification_id,
                    client,
                    predicted_class,
                    top_confidence,
                    model_version,
                    inference_mode,
                    created_at,
                ),
            )
        return classification_id

    def create_feedback(
        self,
        *,
        classification_id: str,
        predicted_class: str,
        selected_class: str,
        subcategory: str | None,
        reason: str,
    ) -> tuple[str, datetime]:
        with self._lock:
            classification = self._connection.execute(
                "SELECT predicted_class FROM classifications WHERE id = ?", (classification_id,)
            ).fetchone()
            if classification is None:
                raise NotFoundError("분류 기록을 찾을 수 없습니다.")
            if classification["predicted_class"] != predicted_class:
                raise AppError(
                    "PREDICTION_MISMATCH",
                    "예측 클래스가 분류 기록과 일치하지 않습니다.",
                    400,
                )
            feedback_id = str(uuid4())
            created_at = datetime.now(UTC)
            try:
                with self._connection:
                    self._connection.execute(
                        "INSERT INTO feedback VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (
                            feedback_id,
                            classification_id,
                            predicted_class,
                            selected_class,
                            subcategory,
                            reason,
                            created_at.isoformat(),
                        ),
                    )
            except sqlite3.IntegrityError as exc:
                raise AppError("FEEDBACK_EXISTS", "이미 피드백이 제출된 분류입니다.", 409) from exc
        return feedback_id, created_at

    def statistics(self) -> dict[str, Any]:
        with self._lock:
            summary = self._connection.execute(
                "SELECT COUNT(*) AS total, COALESCE(AVG(top_confidence), 0) AS average "
                "FROM classifications"
            ).fetchone()
            corrections = self._connection.execute(
                "SELECT COUNT(*) AS count FROM feedback WHERE selected_class != predicted_class"
            ).fetchone()
            counts = self._connection.execute(
                "SELECT predicted_class, COUNT(*) AS count FROM classifications "
                "GROUP BY predicted_class ORDER BY count DESC"
            ).fetchall()
        total = int(summary["total"])
        return {
            "total_classifications": total,
            "average_top_confidence": round(float(summary["average"]), 4),
            "correction_rate": round(int(corrections["count"]) / total, 4) if total else 0.0,
            "category_counts": [
                {"class_name": row["predicted_class"], "count": int(row["count"])} for row in counts
            ],
            "data_mode": "live" if total else "demo",
        }
