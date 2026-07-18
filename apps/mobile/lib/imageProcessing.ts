export const MAX_IMAGE_LONG_EDGE = 1280;
export const UPLOAD_JPEG_QUALITY = 0.8;

export interface ImageDimensions {
  width: number;
  height: number;
}

export function calculateResizeDimensions(
  width: number,
  height: number,
  maxLongEdge = MAX_IMAGE_LONG_EDGE,
): ImageDimensions {
  if (width <= 0 || height <= 0 || maxLongEdge <= 0) {
    throw new Error("이미지 크기는 0보다 커야 합니다.");
  }
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
