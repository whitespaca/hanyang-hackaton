import { healthResponseSchema, type HealthResponse } from "@bunrishot/shared";

export const DEFAULT_API_BASE_URL = "http://localhost:8000";

export interface ApiBaseUrlConfiguration {
  baseUrl: string;
  isValid: boolean;
  warning?: string;
}

export interface NetworkDiagnostic {
  apiUrl: string;
  httpStatus?: number;
  health?: HealthResponse;
  error?: string;
}

export function inspectApiBaseUrl(value: string | undefined): ApiBaseUrlConfiguration {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  try {
    const parsed = new URL(candidate);
    if (!(["http:", "https:"] as string[]).includes(parsed.protocol) || !parsed.hostname) {
      throw new Error("HTTP 또는 HTTPS URL이 아닙니다.");
    }
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error("origin만 입력해야 합니다.");
    }
    const baseUrl = parsed.origin;
    const isDeviceLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return {
      baseUrl,
      isValid: true,
      ...(isDeviceLoopback
        ? {
            warning:
              "실제 기기에서 localhost는 휴대폰 자신을 가리킵니다. 개발 PC의 LAN IP를 입력하세요.",
          }
        : {}),
    };
  } catch {
    return {
      baseUrl: DEFAULT_API_BASE_URL,
      isValid: false,
      warning: "EXPO_PUBLIC_API_BASE_URL 형식이 올바르지 않아 localhost 기본값을 사용합니다.",
    };
  }
}

export async function runNetworkDiagnostic(
  baseUrl: string,
  timeoutMs = 5_000,
  fetcher: typeof fetch = fetch,
): Promise<NetworkDiagnostic> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`${baseUrl}/api/v1/health`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    const parsed = healthResponseSchema.safeParse(body);
    if (!response.ok) {
      return { apiUrl: baseUrl, httpStatus: response.status, error: `HTTP ${response.status}` };
    }
    if (!parsed.success) {
      return {
        apiUrl: baseUrl,
        httpStatus: response.status,
        error: "health 응답 형식이 올바르지 않습니다.",
      };
    }
    return { apiUrl: baseUrl, httpStatus: response.status, health: parsed.data };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "연결 시간이 초과되었습니다."
        : "API에 연결할 수 없습니다.";
    return { apiUrl: baseUrl, error: message };
  } finally {
    clearTimeout(timer);
  }
}
