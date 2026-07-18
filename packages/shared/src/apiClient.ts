import type { GarbageClass } from "./constants";
import {
  apiErrorBodySchema,
  classificationResponseSchema,
  feedbackResponseSchema,
  guideCategorySchema,
  guideItemSchema,
  guidesResponseSchema,
  healthResponseSchema,
  statisticsResponseSchema,
  type ClassificationResponse,
  type FeedbackInput,
  type FeedbackResponse,
  type GuideCategory,
  type GuideItem,
  type GuidesResponse,
  type HealthResponse,
  type StatisticsResponse,
} from "./schemas";
import type { ZodType } from "zod";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ClassifyInput {
  image: Blob;
  fileName?: string;
  client?: "web" | "mobile";
}

export interface GarbageApiClient {
  health(): Promise<HealthResponse>;
  classify(input: ClassifyInput): Promise<ClassificationResponse>;
  listGuides(): Promise<GuidesResponse>;
  getCategory(category: GarbageClass): Promise<GuideCategory>;
  getGuide(category: GarbageClass, subcategory: string): Promise<GuideItem>;
  submitFeedback(input: FeedbackInput): Promise<FeedbackResponse>;
  getStatistics(): Promise<StatisticsResponse>;
}

export function createApiClient(baseUrl: string, timeoutMs = 10_000): GarbageApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        ...init,
        headers: { Accept: "application/json", ...init?.headers },
        signal: controller.signal,
      });
      const requestId = response.headers.get("X-Request-ID") ?? undefined;
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const parsed = apiErrorBodySchema.safeParse(body);
        if (parsed.success) {
          throw new ApiClientError(
            parsed.data.error.message,
            parsed.data.error.code,
            response.status,
            parsed.data.error.requestId,
            parsed.data.error.details,
          );
        }
        throw new ApiClientError("서버 응답을 처리할 수 없습니다.", "INVALID_RESPONSE", response.status, requestId);
      }
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw new ApiClientError("서버 응답 형식이 올바르지 않습니다.", "INVALID_RESPONSE", response.status, requestId, parsed.error.flatten());
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiClientError("서버 응답 시간이 초과되었습니다. 다시 시도해주세요.", "TIMEOUT", 0);
      }
      throw new ApiClientError("서버에 연결할 수 없습니다. 네트워크와 API 주소를 확인해주세요.", "NETWORK_ERROR", 0);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    health: () => request("/api/v1/health", healthResponseSchema),
    classify: ({ image, fileName = "upload.jpg", client = "web" }) => {
      const form = new FormData();
      form.append("image", image, fileName);
      form.append("client", client);
      return request("/api/v1/classifications", classificationResponseSchema, { method: "POST", body: form });
    },
    listGuides: () => request("/api/v1/guides", guidesResponseSchema),
    getCategory: (category) => request(`/api/v1/guides/${category}`, guideCategorySchema),
    getGuide: (category, subcategory) => request(`/api/v1/guides/${category}/${encodeURIComponent(subcategory)}`, guideItemSchema),
    submitFeedback: ({ classificationId, ...body }) => request(
      `/api/v1/classifications/${classificationId}/feedback`,
      feedbackResponseSchema,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    ),
    getStatistics: () => request("/api/v1/statistics/summary", statisticsResponseSchema),
  };
}
