import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  classificationResponseSchema,
  createApiClient,
  disposalItemSchema,
  formatConfidence,
  isLowConfidence,
  normalizeSearchText,
  removeRecentSearch,
  upsertRecentSearch,
} from "../src";

describe("shared contract", () => {
  it("formats and compares confidence", () => {
    expect(formatConfidence(0.7812)).toBe("78%");
    expect(isLowConfidence(0.64, 0.65)).toBe(true);
  });

  it("rejects invalid predictions", () => {
    const result = classificationResponseSchema.safeParse({
      classificationId: crypto.randomUUID(),
      predictions: [{ className: "unknown", labelKo: "?", confidence: 2 }],
      needsConfirmation: true,
      confidenceThreshold: 0.65,
      model: { name: "mock", version: "1", inferenceMode: "mock" },
    });
    expect(result.success).toBe(false);
  });

  it("uploads a file-like Blob through injected fetch without setting multipart content type", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const fetchImplementation: typeof globalThis.fetch = async (
      input,
      init,
    ) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          classificationId: crypto.randomUUID(),
          predictions: [
            { className: "plastic", labelKo: "플라스틱", confidence: 0.8 },
            { className: "glass", labelKo: "유리", confidence: 0.15 },
            { className: "metal", labelKo: "금속", confidence: 0.05 },
          ],
          needsConfirmation: false,
          confidenceThreshold: 0.65,
          model: { name: "mock", version: "1", inferenceMode: "mock" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const client = createApiClient(
      "http://api.example",
      1_000,
      fetchImplementation,
    );

    await client.classify({
      image: new Blob(["jpeg"], { type: "image/jpeg" }),
      fileName: "upload.jpg",
      client: "mobile",
    });

    expect(requestUrl).toBe("http://api.example/api/v1/classifications");
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.body).toBeInstanceOf(FormData);
    const headers = new Headers(requestInit?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.has("Content-Type")).toBe(false);
    const form = requestInit?.body as FormData;
    expect(form.get("client")).toBe("mobile");
    expect(form.get("image")).toBeInstanceOf(Blob);
  });

  it("preserves the original transport error as the API error cause", async () => {
    const transportError = new TypeError("multipart serialization failed");
    const client = createApiClient("http://api.example", 1_000, async () => {
      throw transportError;
    });

    const error = await client
      .classify({ image: new Blob(["jpeg"], { type: "image/jpeg" }) })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: "NETWORK_ERROR",
      cause: transportError,
    });
  });

  it("validates disposal reasons and sources", () => {
    const valid = disposalItemSchema.safeParse({
      id: "power-bank", nameKo: "보조배터리", aliases: ["휴대용 배터리"], keywords: ["충전"],
      classificationCategory: "battery", group: "battery", groupLabel: "배터리", recyclability: "special",
      summary: "전용 수거처를 확인합니다.", steps: ["전원을 끕니다.", "단자를 절연합니다."], warnings: ["손상 제품은 충전하지 마세요."],
      reasons: [{ title: "절연 이유", explanation: "단락을 예방합니다." }], spotTypes: ["battery-box"], regionalNote: "지역 기준을 확인하세요.",
      source: { name: "공식 안내", url: null, checkedAt: "2026-07-19" }, popular: true,
    });
    expect(valid.success).toBe(true);
    expect(disposalItemSchema.safeParse({ ...valid.data, reasons: [] }).success).toBe(false);
    expect(disposalItemSchema.safeParse({ ...valid.data, source: { name: "", url: null, checkedAt: "19-07-2026" } }).success).toBe(false);
  });

  it("normalizes search text and manages recent searches", () => {
    expect(normalizeSearchText("  보조-배터리! ")).toBe("보조배터리");
    const first = { itemId: "a", query: "처음", nameKo: "A", searchedAt: "2026-07-19T00:00:00.000Z" };
    const newer = { itemId: "a", query: "다시", nameKo: "A", searchedAt: "2026-07-19T01:00:00.000Z" };
    const other = { itemId: "b", query: "둘", nameKo: "B", searchedAt: "2026-07-19T00:30:00.000Z" };
    expect(upsertRecentSearch([first, other], newer, 2)).toEqual([newer, other]);
    expect(removeRecentSearch([newer, other], "a")).toEqual([other]);
    expect(upsertRecentSearch([first], newer, 0)).toEqual([]);
    const many = Array.from({ length: 22 }, (_, index) => ({
      itemId: String(index), query: String(index), nameKo: String(index),
      searchedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    }));
    expect(upsertRecentSearch(many, newer)).toHaveLength(20);
    expect(upsertRecentSearch(many, newer)[0]).toEqual(newer);
  });

  it("encodes item search queries and validates the response", async () => {
    let requested = "";
    const client = createApiClient("http://api.example", 1_000, async (input) => {
      requested = String(input);
      return new Response(JSON.stringify({ query: "보조 배터리", results: [], suggestions: [] }), { status: 200 });
    });
    await client.searchItems("보조 배터리", 5);
    expect(requested).toBe("http://api.example/api/v1/items/search?q=%EB%B3%B4%EC%A1%B0+%EB%B0%B0%ED%84%B0%EB%A6%AC&limit=5");
  });
});
