import { createApiClient } from "@bunrishot/shared";
import { inspectApiBaseUrl } from "./apiConfig";

export const apiConfiguration = inspectApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
export const apiClient = createApiClient(apiConfiguration.baseUrl, 15_000);
