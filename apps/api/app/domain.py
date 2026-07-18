from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

from PIL import Image

GarbageClass = Literal[
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
]

GARBAGE_CLASSES: tuple[GarbageClass, ...] = (
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

GARBAGE_LABELS = {
    "metal": "금속",
    "glass": "유리",
    "biological": "음식물·생물성",
    "paper": "종이",
    "battery": "배터리",
    "trash": "일반쓰레기",
    "cardboard": "골판지",
    "shoes": "신발",
    "clothes": "의류",
    "plastic": "플라스틱",
}


@dataclass(frozen=True)
class Prediction:
    class_name: GarbageClass
    confidence: float


class Predictor(Protocol):
    @property
    def model_name(self) -> str: ...

    @property
    def model_version(self) -> str: ...

    @property
    def inference_mode(self) -> Literal["mock", "model"]: ...

    @property
    def model_loaded(self) -> bool: ...

    @property
    def fallback_reason(self) -> str | None: ...

    def predict(self, image: Image.Image, top_k: int = 3) -> list[Prediction]: ...
