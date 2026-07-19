from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    spot_types: list[str]
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
