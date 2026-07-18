import { createApiClient } from "@bunrishot/shared";

export const apiClient = createApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
);
