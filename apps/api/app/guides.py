from __future__ import annotations

import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, cast

from app.domain import GARBAGE_CLASSES, GarbageClass
from app.errors import NotFoundError
from app.schemas import (
    DisposalItem,
    GuideCategory,
    GuideItem,
    GuidesResponse,
    ItemSearchResponse,
    ItemsResponse,
    ItemSummary,
)


def normalize_search_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).strip().casefold()
    return "".join(character for character in normalized if character.isalnum())


def _tokens(value: str) -> list[str]:
    return [normalize_search_text(token) for token in re.split(r"[^\w가-힣]+", value) if token]


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
        self._items = [
            DisposalItem.model_validate(item) for item in cast(list[dict[str, Any]], raw["items"])
        ]
        self._validate_catalog()
        self._by_id = {item.id: item for item in self._items}
        self._data_order = {item.id: index for index, item in enumerate(self._items)}

    def _validate_catalog(self) -> None:
        ids: set[str] = set()
        searchable: dict[str, str] = {}
        for item in self._items:
            if item.id in ids:
                raise ValueError(f"Duplicate item id: {item.id}")
            ids.add(item.id)
            name = normalize_search_text(item.name_ko)
            if name in searchable:
                raise ValueError(f"Duplicate item name: {item.id} and {searchable[name]}")
            searchable[name] = item.id
            for alias in item.aliases:
                normalized = normalize_search_text(alias)
                owner = searchable.get(normalized)
                if normalized == name or (owner is not None and owner != item.id):
                    raise ValueError(f"Duplicate item alias: {item.id}/{alias}")
                searchable[normalized] = item.id
        if not 40 <= len(self._items) <= 50:
            raise ValueError("Item catalog must contain between 40 and 50 items")
        for category in GARBAGE_CLASSES:
            if not any(item.classification_category == category for item in self._items):
                raise ValueError(f"Category has no guide item: {category}")

    @staticmethod
    def _summary(item: DisposalItem) -> ItemSummary:
        return ItemSummary.model_validate(item.model_dump())

    def _guide_item(self, category: GarbageClass, item: DisposalItem) -> GuideItem:
        return GuideItem.model_validate(
            {
                **item.model_dump(),
                "category": category,
                "subcategory": item.id,
                "title": item.name_ko,
                "source_note": self._source_note,
                "disclaimer": self._disclaimer,
            }
        )

    def category(self, category: GarbageClass) -> GuideCategory:
        raw = self._categories.get(category)
        if raw is None:
            raise NotFoundError("해당 분리배출 카테고리를 찾을 수 없습니다.")
        return GuideCategory(
            id=category,
            label=raw["label"],
            description=raw["description"],
            subcategories=[
                self._guide_item(category, item)
                for item in self._items
                if item.classification_category == category
            ],
        )

    def list_guides(self) -> GuidesResponse:
        return GuidesResponse(
            version=self._version,
            locale=self._locale,
            disclaimer=self._disclaimer,
            categories=[self.category(category) for category in GARBAGE_CLASSES],
        )

    def detail(self, category: GarbageClass, subcategory: str) -> GuideItem:
        item = self._by_id.get(subcategory)
        if item is None or item.classification_category != category:
            raise NotFoundError("해당 세부 품목 가이드를 찾을 수 없습니다.")
        return self._guide_item(category, item)

    def list_items(self) -> ItemsResponse:
        return ItemsResponse(
            version=self._version,
            locale=self._locale,
            items=[self._summary(item) for item in self._items],
        )

    def item(self, item_id: str) -> DisposalItem:
        item = self._by_id.get(item_id)
        if item is None:
            raise NotFoundError("해당 품목을 찾을 수 없습니다.")
        return item

    @staticmethod
    def _direct_score(item: DisposalItem, query: str, query_tokens: list[str]) -> int:
        name = normalize_search_text(item.name_ko)
        aliases = [normalize_search_text(alias) for alias in item.aliases]
        keywords = [normalize_search_text(keyword) for keyword in item.keywords]
        group = normalize_search_text(item.group_label)
        if query == name:
            return 100
        if query in aliases:
            return 95
        if name.startswith(query):
            return 90
        if any(alias.startswith(query) for alias in aliases):
            return 85
        if query in name:
            return 80
        if any(query in alias for alias in aliases):
            return 75
        if query in keywords:
            return 70
        if any(keyword.startswith(query) for keyword in keywords):
            return 65
        if any(query in keyword for keyword in keywords):
            return 60
        fields = [name, *aliases, *keywords, group]
        if query_tokens and all(any(token in field for field in fields) for token in query_tokens):
            return 55
        return 0

    def search(self, query: str, limit: int) -> ItemSearchResponse:
        normalized_query = normalize_search_text(query)
        query_tokens = _tokens(query)
        ranked: list[tuple[int, int, int, DisposalItem]] = []
        for item in self._items:
            score = self._direct_score(item, normalized_query, query_tokens)
            if score:
                ranked.append((score, int(item.popular), -self._data_order[item.id], item))
        ranked.sort(reverse=True, key=lambda entry: entry[:3])
        results = [entry[3] for entry in ranked[:limit]]
        result_ids = {item.id for item in results}

        suggestions: list[tuple[float, int, int, DisposalItem]] = []
        if len(normalized_query) >= 2 and len(results) < limit:
            for item in self._items:
                if item.id in result_ids:
                    continue
                candidates = [
                    normalize_search_text(item.name_ko),
                    *[normalize_search_text(alias) for alias in item.aliases],
                ]
                similarity = max(
                    SequenceMatcher(None, normalized_query, candidate).ratio()
                    for candidate in candidates
                )
                if similarity >= 0.58:
                    suggestions.append(
                        (similarity, int(item.popular), -self._data_order[item.id], item)
                    )
            suggestions.sort(reverse=True, key=lambda entry: entry[:3])
        suggestion_items = [entry[3] for entry in suggestions[: max(0, limit - len(results))]]
        return ItemSearchResponse(
            query=query.strip(),
            results=[self._summary(item) for item in results],
            suggestions=[self._summary(item) for item in suggestion_items],
        )
