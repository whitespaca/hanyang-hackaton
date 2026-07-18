export const MAX_IMAGE_LONG_EDGE = 1280;
export const UPLOAD_JPEG_QUALITY = 0.8;

export interface ImageDimensions {
  width: number;
  height: number;
}

type BinaryResponse = Response & {
  bytes(): Promise<Uint8Array>;
};

export type FetchImplementation = typeof fetch;

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

export async function readLocalImageBlob(
  uri: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<Blob> {
  const response = (await fetchImplementation(uri)) as BinaryResponse;

  if (typeof response.bytes !== "function") {
    throw new Error("현재 실행 환경에서 이미지 바이트 읽기를 지원하지 않습니다.");
  }

  const bytes = await response.bytes();

  if (bytes.byteLength <= 0) {
    throw new Error("압축한 이미지가 비어 있습니다.");
  }

  const copiedBytes = Uint8Array.from(bytes);
  return new Blob([copiedBytes.buffer], { type: "image/jpeg" });
}
