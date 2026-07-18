from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from app.domain import GARBAGE_CLASSES, GarbageClass
from app.errors import NotFoundError
from app.schemas import GuideCategory, GuideItem, GuidesResponse


class GuideService:
    def __init__(self, path: Path) -> None:
        raw = cast(dict[str, Any], json.loads(path.read_text(encoding="utf-8")))
        self._version = str(raw["version"])
        self._locale = str(raw["locale"])
        self._disclaimer = str(raw["disclaimer"])
        self._source_note = str(raw["sourceNote"])
        categories = cast(list[dict[str, Any]], raw["categories"])
        ids = [category["id"] for category in categories]
        if ids != list(GARBAGE_CLASSES):
            raise ValueError("Guide category order must match the canonical class order")
        self._categories = {str(category["id"]): category for category in categories}

    def _item(self, category: GarbageClass, raw: dict[str, Any]) -> GuideItem:
        return GuideItem(
            category=category,
            subcategory=raw["id"],
            title=raw["label"],
            recyclability=raw["recyclability"],
            steps=raw["steps"],
            warnings=raw["warnings"],
            keywords=raw["keywords"],
            source_note=self._source_note,
            disclaimer=self._disclaimer,
        )

    def category(self, category: GarbageClass) -> GuideCategory:
        raw = self._categories.get(category)
        if raw is None:
            raise NotFoundError("해당 분리배출 카테고리를 찾을 수 없습니다.")
        items = cast(list[dict[str, Any]], raw["subcategories"])
        return GuideCategory(
            id=category,
            label=raw["label"],
            description=raw["description"],
            subcategories=[self._item(category, item) for item in items],
        )

    def list(self) -> GuidesResponse:
        return GuidesResponse(
            version=self._version,
            locale=self._locale,
            disclaimer=self._disclaimer,
            categories=[self.category(category) for category in GARBAGE_CLASSES],
        )

    def detail(self, category: GarbageClass, subcategory: str) -> GuideItem:
        result = self.category(category)
        for item in result.subcategories:
            if item.subcategory == subcategory:
                return item
        raise NotFoundError("해당 세부 품목 가이드를 찾을 수 없습니다.")
