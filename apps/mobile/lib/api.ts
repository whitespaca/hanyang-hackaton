import {
  ApiClientError,
  apiErrorBodySchema,
  classificationResponseSchema,
  createApiClient,
  type ClassificationResponse,
} from "@bunrishot/shared";

import { createNativeImageUploadPart } from "./imageProcessing";
import { inspectApiBaseUrl } from "./apiConfig";

const MOBILE_REQUEST_TIMEOUT_MS = 15_000;

export const apiConfiguration = inspectApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
export const apiClient = createApiClient(
  apiConfiguration.baseUrl,
  MOBILE_REQUEST_TIMEOUT_MS,
);

export async function classifyImageUri(
  uri: string,
  client: "mobile" = "mobile",
): Promise<ClassificationResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MOBILE_REQUEST_TIMEOUT_MS);
  const form = new FormData();
  const image = createNativeImageUploadPart(uri);

  form.append("image", image as unknown as Blob);
  form.append("client", client);

  try {
    const response = await fetch(
      `${apiConfiguration.baseUrl.replace(/\/$/, "")}/api/v1/classifications`,
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
        signal: controller.signal,
      },
    );
    const requestId = response.headers.get("X-Request-ID") ?? undefined;
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const parsedError = apiErrorBodySchema.safeParse(body);
      if (parsedError.success) {
        throw new ApiClientError(
          parsedError.data.error.message,
          parsedError.data.error.code,
          response.status,
          parsedError.data.error.requestId,
          parsedError.data.error.details,
        );
      }
      throw new ApiClientError(
        "서버 응답을 처리할 수 없습니다.",
        "INVALID_RESPONSE",
        response.status,
        requestId,
      );
    }

    const parsed = classificationResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiClientError(
        "서버 응답 형식이 올바르지 않습니다.",
        "INVALID_RESPONSE",
        response.status,
        requestId,
        parsed.error.flatten(),
      );
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiClientError(
        "서버 응답 시간이 초과되었습니다. 다시 시도해주세요.",
        "TIMEOUT",
        0,
      );
    }
    throw new ApiClientError(
      "서버에 연결할 수 없습니다. 네트워크와 API 주소를 확인해주세요.",
      "NETWORK_ERROR",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
