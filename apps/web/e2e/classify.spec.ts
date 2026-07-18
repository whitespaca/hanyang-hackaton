import { expect, test, type Route } from "@playwright/test";

const classification = {
  classificationId: "11111111-1111-4111-8111-111111111111",
  predictions: [
    { className: "cardboard", labelKo: "골판지", confidence: 0.82 },
    { className: "paper", labelKo: "종이", confidence: 0.12 },
    { className: "plastic", labelKo: "플라스틱", confidence: 0.06 },
  ],
  needsConfirmation: false,
  confidenceThreshold: 0.65,
  model: { name: "deterministic_mock", version: "mock-e2e-001", inferenceMode: "mock" },
};

const guide = {
  category: "cardboard",
  subcategory: "cardboard-box",
  title: "골판지 상자",
  recyclability: "yes",
  steps: ["테이프와 송장을 제거해주세요.", "접어서 부피를 줄여주세요."],
  warnings: ["젖거나 오염된 상자는 일반쓰레기 기준을 확인해주세요."],
  keywords: ["상자", "택배"],
  sourceNote: "일반적인 분리배출 원칙을 요약한 안내입니다.",
  disclaimer: "지역별 세부 배출 기준이 다를 수 있습니다.",
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("이미지 업로드부터 사용자 확인과 가이드까지 완료한다", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/classifications") return json(route, classification);
    if (url.pathname === "/api/v1/guides/cardboard") {
      return json(route, {
        id: "cardboard",
        label: "골판지",
        description: "골판지류 안내",
        subcategories: [guide],
      });
    }
    if (url.pathname === "/api/v1/guides/cardboard/cardboard-box") return json(route, guide);
    if (url.pathname.endsWith("/feedback")) {
      return json(route, {
        feedbackId: "22222222-2222-4222-8222-222222222222",
        classificationId: classification.classificationId,
        createdAt: "2026-07-18T00:00:00Z",
      }, 201);
    }
    return json(route, { error: { code: "NOT_FOUND", message: "not found", requestId: "e2e", details: null } }, 404);
  });

  await page.goto("/classify");
  await page.getByLabel("파일 선택").setInputFiles({
    name: "cardboard-box.png",
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a", "hex"),
  });
  await expect(page.getByAltText("분석할 이미지 미리보기: cardboard-box.png")).toBeVisible();
  await page.getByRole("button", { name: "분석하기" }).click();
  await expect(page.getByRole("list", { name: "AI 예측 Top 3" })).toContainText("골판지");
  await page.getByRole("button", { name: "맞아요" }).click();
  await page.getByRole("button", { name: "골판지 상자" }).click();
  await expect(page.getByRole("region", { name: "골판지 상자 배출 체크리스트" })).toBeVisible();
  await expect(page.getByText("테이프와 송장을 제거해주세요.")).toBeVisible();
  await page.screenshot({ path: "test-results/classify-guide.png", fullPage: true });
});
