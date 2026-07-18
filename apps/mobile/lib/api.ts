import { createApiClient } from "@bunrishot/shared";
import { fetch as expoFetch } from "expo/fetch";

import { inspectApiBaseUrl } from "./apiConfig";

const MOBILE_REQUEST_TIMEOUT_MS = 15_000;

export const apiConfiguration = inspectApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
export const apiClient = createApiClient(
  apiConfiguration.baseUrl,
  MOBILE_REQUEST_TIMEOUT_MS,
  expoFetch as typeof globalThis.fetch,
);
