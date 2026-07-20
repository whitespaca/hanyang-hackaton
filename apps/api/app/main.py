from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, cast
from uuid import uuid4

from fastapi import FastAPI, File, Form, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Settings
from app.domain import GARBAGE_LABELS, GarbageClass, Predictor
from app.errors import AppError
from app.guides import GuideService
from app.image_service import read_image
from app.predictors import create_predictor
from app.repository import SQLiteRepository
from app.schemas import (
    ClassificationResponse,
    CollectionSpotsResponse,
    CollectionSpotType,
    DisposalItem,
    FeedbackRequest,
    FeedbackResponse,
    GuideCategory,
    GuideItem,
    GuidesResponse,
    HealthResponse,
    ItemSearchResponse,
    ItemsResponse,
    ModelInfo,
    NearbySpotsRequest,
    NearbySpotsResponse,
    PredictionResponse,
    StatisticsResponse,
)
from app.spots import CollectionSpotService


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        repository = SQLiteRepository(app_settings.sqlite_path())
        repository.initialize()
        predictor = create_predictor(
            app_settings.inference_mode,
            app_settings.resolve_api_path(app_settings.model_path),
            app_settings.resolve_api_path(app_settings.model_metadata_path),
            app_settings.app_env,
        )
        app.state.settings = app_settings
        app.state.repository = repository
        app.state.predictor = predictor
        app.state.guides = GuideService(app_settings.guides_path)
        app.state.spots = CollectionSpotService(app_settings.spots_path)
        yield
        repository.close()

    app = FastAPI(title="분리샷 API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next: Any) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return cast(JSONResponse, response)

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "requestId": request.state.request_id,
                    "details": exc.details,
                }
            },
            headers={"X-Request-ID": request.state.request_id},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "요청 형식이 올바르지 않습니다.",
                    "requestId": request.state.request_id,
                    "details": exc.errors(),
                }
            },
            headers={"X-Request-ID": request.state.request_id},
        )

    def repository(request: Request) -> SQLiteRepository:
        return cast(SQLiteRepository, request.app.state.repository)

    def predictor(request: Request) -> Predictor:
        return cast(Predictor, request.app.state.predictor)

    def guides(request: Request) -> GuideService:
        return cast(GuideService, request.app.state.guides)

    def spots(request: Request) -> CollectionSpotService:
        return cast(CollectionSpotService, request.app.state.spots)

    @app.get("/api/v1/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        active = predictor(request)
        return HealthResponse(
            model_loaded=active.model_loaded,
            model_version=active.model_version,
            inference_mode=active.inference_mode,
            fallback_reason=active.fallback_reason,
        )

    @app.post("/api/v1/classifications", response_model=ClassificationResponse)
    async def classify(
        request: Request,
        image: UploadFile = File(...),
        client: str = Form(default="web", pattern="^(web|mobile)$"),
    ) -> ClassificationResponse:
        decoded = await read_image(image, app_settings.max_upload_bytes)
        active = predictor(request)
        try:
            predictions = active.predict(decoded, top_k=3)
        finally:
            decoded.close()
        top = predictions[0]
        classification_id = repository(request).create_classification(
            client=client,
            predicted_class=top.class_name,
            top_confidence=top.confidence,
            model_version=active.model_version,
            inference_mode=active.inference_mode,
        )
        return ClassificationResponse(
            classification_id=classification_id,
            predictions=[
                PredictionResponse(
                    class_name=item.class_name,
                    label_ko=GARBAGE_LABELS[item.class_name],
                    confidence=item.confidence,
                )
                for item in predictions
            ],
            needs_confirmation=top.confidence < app_settings.confidence_threshold,
            confidence_threshold=app_settings.confidence_threshold,
            model=ModelInfo(
                name=active.model_name,
                version=active.model_version,
                inference_mode=active.inference_mode,
            ),
        )

    @app.get("/api/v1/guides", response_model=GuidesResponse)
    async def list_guides(request: Request) -> GuidesResponse:
        return guides(request).list_guides()

    @app.get("/api/v1/guides/{category}", response_model=GuideCategory)
    async def get_category(request: Request, category: GarbageClass) -> GuideCategory:
        return guides(request).category(category)

    @app.get("/api/v1/guides/{category}/{subcategory}", response_model=GuideItem)
    async def get_guide(request: Request, category: GarbageClass, subcategory: str) -> GuideItem:
        return guides(request).detail(category, subcategory)

    @app.get("/api/v1/items", response_model=ItemsResponse)
    async def list_items(request: Request) -> ItemsResponse:
        return guides(request).list_items()

    @app.get("/api/v1/items/search", response_model=ItemSearchResponse)
    async def search_items(
        request: Request,
        q: str = Query(min_length=1, pattern=r".*\S.*"),
        limit: int = Query(default=8, ge=1, le=20),
    ) -> ItemSearchResponse:
        return guides(request).search(q, limit)

    @app.get("/api/v1/items/{item_id}", response_model=DisposalItem)
    async def get_item(request: Request, item_id: str) -> DisposalItem:
        return guides(request).item(item_id)

    @app.get("/api/v1/spots", response_model=CollectionSpotsResponse)
    async def list_spots(
        request: Request,
        spot_types: list[CollectionSpotType] | None = Query(default=None, alias="type"),
    ) -> CollectionSpotsResponse:
        return spots(request).list(spot_types)

    @app.post("/api/v1/spots/nearby", response_model=NearbySpotsResponse)
    async def nearby_spots(request: Request, body: NearbySpotsRequest) -> NearbySpotsResponse:
        return spots(request).nearby(body)

    @app.post(
        "/api/v1/classifications/{classification_id}/feedback",
        response_model=FeedbackResponse,
        status_code=201,
    )
    async def submit_feedback(
        request: Request, classification_id: str, body: FeedbackRequest
    ) -> FeedbackResponse:
        feedback_id, created_at = repository(request).create_feedback(
            classification_id=classification_id,
            predicted_class=body.predicted_class,
            selected_class=body.selected_class,
            subcategory=body.subcategory,
            reason=body.reason,
        )
        return FeedbackResponse(
            feedback_id=feedback_id,
            classification_id=classification_id,
            created_at=created_at,
        )

    @app.get("/api/v1/statistics/summary", response_model=StatisticsResponse)
    async def statistics(request: Request) -> StatisticsResponse:
        return StatisticsResponse.model_validate(repository(request).statistics())

    return app


app = create_app()
