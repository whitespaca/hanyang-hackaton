import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  classificationResponseSchema,
  createApiClient,
  disposalItemSchema,
  formatConfidence,
  isLowConfidence,
  collectionSpotSchema,
  formatDistance,
  haversineDistanceKm,
  buildKakaoMapDirectionsUrl,
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

  it("validates canonical spot types and calculates distance", () => {
    const spot = {
      id: "janghak-bank-pharmacy-recycling", nameKo: "은행약국 인근 재활용 배출장소", spotTypes: ["recycling-station"],
      address: "강원특별자치도 춘천시 동면 장학리 1014", latitude: 37.89273948, longitude: 127.755362,
      organization: "강원특별자치도 춘천시", phone: null, operatingHours: "18:00~23:00", note: "은행약국 인근",
      source: { name: "공공데이터포털", url: "https://www.data.go.kr/", checkedAt: "2026-04-15" },
    };
    expect(collectionSpotSchema.safeParse(spot).success).toBe(true);
    expect(collectionSpotSchema.safeParse({ ...spot, spotTypes: ["unknown"] }).success).toBe(false);
    expect(haversineDistanceKm(37.529254, 127.125563, 37.529254, 127.125563)).toBe(0);
    expect(haversineDistanceKm(37.5665, 126.978, 35.1796, 129.0756)).toBeGreaterThan(300);
    expect(formatDistance(0.32)).toBe("320m");
    expect(formatDistance(1.24)).toBe("1.2km");
    expect(() => haversineDistanceKm(91, 0, 0, 0)).toThrow(RangeError);
    expect(buildKakaoMapDirectionsUrl("강동 보건소", 37.5, 127.1)).toContain("%EA%B0%95%EB%8F%99%20%EB%B3%B4%EA%B1%B4%EC%86%8C,37.5,127.1");
  });

  it("builds repeated spot filters and JSON nearby requests", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = createApiClient("http://api.example", 1_000, async (input, init) => {
      requests.push({ url: String(input), ...(init ? { init } : {}) });
      const nearby = init?.method === "POST";
      return new Response(JSON.stringify({
        version: "2026-07-19", ...(nearby ? {} : { locale: "ko-KR" }), regionLabel: "서울 시연",
        dataMode: "fixture", disclaimer: "방문 전 확인", lastUpdated: "2026-04-15", spots: [],
      }), { status: 200 });
    });
    await client.listSpots(["medicine-box", "health-center"]);
    await client.findNearbySpots({ latitude: 37.5, longitude: 127, spotTypes: ["medicine-box"] });
    expect(requests[0]?.url).toBe("http://api.example/api/v1/spots?type=medicine-box&type=health-center");
    expect(requests[1]?.init?.method).toBe("POST");
    expect(new Headers(requests[1]?.init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(requests[1]?.init?.body))).toMatchObject({ latitude: 37.5, longitude: 127 });
  });
});
