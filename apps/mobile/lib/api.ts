import { createApiClient } from "@bunrishot/shared";

export const apiClient = createApiClient(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  15_000,
);
