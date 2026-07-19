from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path
from typing import Any, Literal, cast

from pydantic import ValidationError

from app.schemas import (
    CollectionSpot,
    CollectionSpotSource,
    CollectionSpotsResponse,
    CollectionSpotType,
    CollectionSpotWithDistance,
    NearbySpotsRequest,
    NearbySpotsResponse,
)

EARTH_RADIUS_KM = 6371.0088


def haversine_distance_km(
    latitude1: float, longitude1: float, latitude2: float, longitude2: float
) -> float:
    latitude_delta = math.radians(latitude2 - latitude1)
    longitude_delta = math.radians(longitude2 - longitude1)
    first = math.radians(latitude1)
    second = math.radians(latitude2)
    value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(first) * math.cos(second) * math.sin(longitude_delta / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


class CollectionSpotService:
    def __init__(self, path: Path) -> None:
        try:
            raw = cast(dict[str, Any], json.loads(path.read_text(encoding="utf-8")))
            self._version = str(raw["version"])
            self._locale = str(raw["locale"])
            self._region_label = str(raw["regionLabel"])
            self._data_mode = cast(str, raw["dataMode"])
            self._disclaimer = str(raw["disclaimer"])
            self._last_updated = str(raw["lastUpdated"])
            CollectionSpotSource.model_validate(raw["source"])
            self._spots = [
                CollectionSpot.model_validate(spot)
                for spot in cast(list[dict[str, Any]], raw["spots"])
            ]
        except (KeyError, TypeError, json.JSONDecodeError, ValidationError) as error:
            raise ValueError(f"Invalid collection spot fixture: {error}") from error
        if self._data_mode not in {"fixture", "live"}:
            raise ValueError("Collection spot dataMode must be fixture or live")
        if not self._version.strip() or not self._locale.strip() or not self._region_label.strip():
            raise ValueError("Collection spot dataset metadata must not be empty")
        date.fromisoformat(self._last_updated)
        ids = [spot.id for spot in self._spots]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate collection spot id")

    def _filtered(self, spot_types: list[CollectionSpotType] | None) -> list[CollectionSpot]:
        if not spot_types:
            return list(self._spots)
        requested = set(spot_types)
        return [spot for spot in self._spots if requested.intersection(spot.spot_types)]

    def list(self, spot_types: list[CollectionSpotType] | None = None) -> CollectionSpotsResponse:
        return CollectionSpotsResponse(
            version=self._version,
            locale=self._locale,
            region_label=self._region_label,
            data_mode=cast(Literal["fixture", "live"], self._data_mode),
            disclaimer=self._disclaimer,
            last_updated=self._last_updated,
            spots=self._filtered(spot_types),
        )

    def nearby(self, request: NearbySpotsRequest) -> NearbySpotsResponse:
        ranked: list[tuple[float, int, CollectionSpot]] = []
        for index, spot in enumerate(self._filtered(request.spot_types)):
            distance = haversine_distance_km(
                request.latitude, request.longitude, spot.latitude, spot.longitude
            )
            if distance <= request.radius_km:
                ranked.append((distance, index, spot))
        ranked.sort(key=lambda entry: (entry[0], entry[1]))
        return NearbySpotsResponse(
            version=self._version,
            region_label=self._region_label,
            data_mode=cast(Literal["fixture", "live"], self._data_mode),
            disclaimer=self._disclaimer,
            last_updated=self._last_updated,
            spots=[
                CollectionSpotWithDistance(**spot.model_dump(), distance_km=distance)
                for distance, _, spot in ranked[: request.limit]
            ],
        )
