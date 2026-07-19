from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.domain import GARBAGE_CLASSES, GarbageClass


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PredictionResponse(ApiModel):
    class_name: GarbageClass
    label_ko: str
    confidence: float = Field(ge=0, le=1)


class ModelInfo(ApiModel):
    name: str
    version: str
    inference_mode: Literal["mock", "model"]


class ClassificationResponse(ApiModel):
    classification_id: str
    predictions: list[PredictionResponse]
    needs_confirmation: bool
    confidence_threshold: float
    model: ModelInfo


class HealthResponse(ApiModel):
    status: Literal["ok"] = "ok"
    service: Literal["garbage-ai-api"] = "garbage-ai-api"
    model_loaded: bool
    model_version: str
    inference_mode: Literal["mock", "model"]
    fallback_reason: str | None = None


class DisposalReason(ApiModel):
    title: str = Field(min_length=1)
    explanation: str = Field(min_length=1)


class DisposalSource(ApiModel):
    name: str = Field(min_length=1)
    url: str | None = None
    checked_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class CollectionSpotType(StrEnum):
    BATTERY_BOX = "battery-box"
    BULKY_WASTE = "bulky-waste"
    CLOTHES_BIN = "clothes-bin"
    CUP_BIN = "cup-bin"
    DONATION_CENTER = "donation-center"
    FOOD_WASTE_BIN = "food-waste-bin"
    GENERAL_WASTE = "general-waste"
    GLASS_BIN = "glass-bin"
    HAZARDOUS_WASTE = "hazardous-waste"
    HEALTH_CENTER = "health-center"
    LAMP_BOX = "lamp-box"
    MANUFACTURER_TAKEBACK = "manufacturer-takeback"
    MEDICINE_BOX = "medicine-box"
    NON_COMBUSTIBLE_WASTE = "non-combustible-waste"
    PAPER_BIN = "paper-bin"
    PAPER_CUP_BIN = "paper-cup-bin"
    PAPER_PACK_BIN = "paper-pack-bin"
    PET_BOTTLE_BIN = "pet-bottle-bin"
    PLASTIC_BIN = "plastic-bin"
    RECYCLING_STATION = "recycling-station"
    REUSE_BOX = "reuse-box"
    SMALL_ELECTRONICS = "small-electronics"
    STYROFOAM_BIN = "styrofoam-bin"
    TEXTILE_COLLECTION = "textile-collection"
    VINYL_BIN = "vinyl-bin"


class DisposalItem(ApiModel):
    id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name_ko: str = Field(min_length=1)
    aliases: list[str]
    keywords: list[str] = Field(min_length=1)
    classification_category: GarbageClass | None
    group: str = Field(min_length=1)
    group_label: str = Field(min_length=1)
    recyclability: Literal["yes", "conditional", "no", "special"]
    summary: str = Field(min_length=1)
    steps: list[str] = Field(min_length=2)
    warnings: list[str] = Field(min_length=1)
    reasons: list[DisposalReason] = Field(min_length=1)
    spot_types: list[CollectionSpotType] = Field(min_length=1)
    regional_note: str = Field(min_length=1)
    source: DisposalSource
    popular: bool


class ItemSummary(ApiModel):
    id: str
    name_ko: str
    aliases: list[str]
    classification_category: GarbageClass | None
    group: str
    group_label: str
    recyclability: Literal["yes", "conditional", "no", "special"]
    summary: str
    popular: bool


class ItemsResponse(ApiModel):
    version: str
    locale: str
    items: list[ItemSummary]


class ItemSearchResponse(ApiModel):
    query: str
    results: list[ItemSummary]
    suggestions: list[ItemSummary]


class CollectionSpotSource(ApiModel):
    name: str = Field(min_length=1)
    url: HttpUrl | None = None
    checked_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")

    @field_validator("name")
    @classmethod
    def validate_source_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("source name must not be blank")
        return value

    @field_validator("checked_at")
    @classmethod
    def validate_checked_at(cls, value: str) -> str:
        date.fromisoformat(value)
        return value


class CollectionSpot(ApiModel):
    id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name_ko: str = Field(min_length=1)
    spot_types: list[CollectionSpotType] = Field(min_length=1)
    address: str = Field(min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    organization: str | None = None
    phone: str | None = None
    operating_hours: str | None = None
    note: str | None = None
    source: CollectionSpotSource

    @field_validator("name_ko", "address")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("spot text must not be blank")
        return value

    @field_validator("spot_types")
    @classmethod
    def validate_unique_spot_types(
        cls, value: list[CollectionSpotType]
    ) -> list[CollectionSpotType]:
        if len(value) != len(set(value)):
            raise ValueError("spotTypes must not contain duplicates")
        return value


class CollectionSpotWithDistance(CollectionSpot):
    distance_km: float = Field(ge=0)


class CollectionSpotsResponse(ApiModel):
    version: str
    locale: str
    region_label: str
    data_mode: Literal["fixture", "live"]
    disclaimer: str
    last_updated: str
    spots: list[CollectionSpot]


class NearbySpotsRequest(ApiModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    spot_types: list[CollectionSpotType] | None = Field(default=None, min_length=1)
    limit: int = Field(default=20, ge=1, le=50)
    radius_km: float = Field(default=10, gt=0, le=50)


class NearbySpotsResponse(ApiModel):
    version: str
    region_label: str
    data_mode: Literal["fixture", "live"]
    disclaimer: str
    last_updated: str
    spots: list[CollectionSpotWithDistance]


class GuideItem(DisposalItem):
    category: GarbageClass
    subcategory: str
    title: str
    source_note: str
    disclaimer: str


class GuideCategory(ApiModel):
    id: GarbageClass
    label: str
    description: str
    subcategories: list[GuideItem]


class GuidesResponse(ApiModel):
    version: str
    locale: str
    disclaimer: str
    categories: list[GuideCategory]


class FeedbackRequest(ApiModel):
    predicted_class: GarbageClass
    selected_class: GarbageClass
    subcategory: str | None = None
    reason: Literal["confirmed", "user_correction"]


class FeedbackResponse(ApiModel):
    feedback_id: str
    classification_id: str
    created_at: datetime


class CategoryCount(ApiModel):
    class_name: GarbageClass
    count: int


class StatisticsResponse(ApiModel):
    total_classifications: int
    correction_rate: float
    average_top_confidence: float
    category_counts: list[CategoryCount]
    data_mode: Literal["demo", "live"]


class ErrorDetail(ApiModel):
    code: str
    message: str
    request_id: str
    details: Any | None = None


class ErrorResponse(ApiModel):
    error: ErrorDetail


class ModelNormalization(ApiModel):
    mean: tuple[float, float, float]
    std: tuple[float, float, float]


class ModelMetadata(ApiModel):
    model_name: str = Field(min_length=1)
    model_version: str = Field(min_length=1)
    input_size: tuple[int, int]
    classes: tuple[GarbageClass, ...]
    normalization: ModelNormalization
    confidence_threshold: float = Field(ge=0, le=1)

    @field_validator("input_size")
    @classmethod
    def validate_input_size(cls, value: tuple[int, int]) -> tuple[int, int]:
        if any(dimension <= 0 for dimension in value):
            raise ValueError("inputSize dimensions must be positive")
        return value

    @field_validator("classes")
    @classmethod
    def validate_class_order(cls, value: tuple[GarbageClass, ...]) -> tuple[GarbageClass, ...]:
        if value != GARBAGE_CLASSES:
            raise ValueError("classes must match the API class order")
        return value
