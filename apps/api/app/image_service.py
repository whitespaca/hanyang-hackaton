from __future__ import annotations

import io
import warnings

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.errors import AppError

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MIN_IMAGE_DIMENSION = 32
READ_CHUNK_BYTES = 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000


async def read_image(upload: UploadFile, max_bytes: int) -> Image.Image:
    if upload.content_type not in ALLOWED_MIME_TYPES:
        raise AppError(
            "UNSUPPORTED_MEDIA_TYPE",
            "JPG, PNG 또는 WebP 이미지만 업로드할 수 있습니다.",
            415,
        )
    chunks: list[bytes] = []
    size = 0
    while chunk := await upload.read(READ_CHUNK_BYTES):
        size += len(chunk)
        if size > max_bytes:
            raise AppError("FILE_TOO_LARGE", "이미지는 8 MiB 이하여야 합니다.", 413)
        chunks.append(chunk)
    if size == 0:
        raise AppError("INVALID_IMAGE", "비어 있는 파일은 분석할 수 없습니다.", 422)
    raw = b"".join(chunks)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as probe:
                probe.verify()
            with Image.open(io.BytesIO(raw)) as decoded:
                image = ImageOps.exif_transpose(decoded).convert("RGB")
                image.load()
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise AppError(
            "INVALID_IMAGE",
            "이미지를 읽을 수 없습니다. JPG, PNG 또는 WebP 파일을 다시 선택해주세요.",
            422,
        ) from exc
    if min(image.size) < MIN_IMAGE_DIMENSION:
        image.close()
        raise AppError("IMAGE_TOO_SMALL", "이미지 가로와 세로는 각각 32px 이상이어야 합니다.", 422)
    return image
