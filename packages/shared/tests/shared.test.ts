import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  classificationResponseSchema,
  createApiClient,
  formatConfidence,
  isLowConfidence,
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
});
