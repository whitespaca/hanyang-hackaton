import { expect, test, type Page, type Request } from "@playwright/test";

const API_BASE_URL = "http://127.0.0.1:8100";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const LOW_CONFIDENCE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAfUlEQVR4nNXOQREAMAjAsK7a8K9pInhwjYI8GMokTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuIkTuK8Dmx9EesAxJDAbCAAAAAASUVORK5CYII=",
  "base64",
);
const HIGH_CONFIDENCE_PNG = LOW_CONFIDENCE_PNG;

function appAlert(page: Page) {
  return page.locator(".card[role='alert']");
}

async function selectImage(
  page: Page,
  buffer: Buffer = HIGH_CONFIDENCE_PNG,
  name = "cardboard.png",
  mimeType = "image/png",
) {
  await page.goto("/classify");
  const dropzone = page.getByRole("button", { name: /이미지를 끌어놓거나 선택하세요/ });
  await dropzone.focus();
  await expect(dropzone).toBeFocused();
  await page.getByLabel("파일 선택").setInputFiles({ name, mimeType, buffer });
}

async function analyze(page: Page) {
  await page.getByRole("button", { name: "분석하기" }).click();
  await expect(page.getByRole("list", { name: "AI 예측 Top 3" })).toBeVisible();
}

test.describe("분류 수직 흐름", () => {
  test("실제 mock API로 업로드부터 가이드와 초기화까지 완료한다", async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/v1/classifications`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });
    await selectImage(page);
    await expect(page.getByAltText("분석할 이미지 미리보기: cardboard.png")).toBeVisible();
    await page.getByRole("button", { name: "분석하기" }).click();
    await expect(page.getByRole("status")).toContainText("Top 3를 계산하는 중");
    await expect(page.getByRole("list", { name: "AI 예측 Top 3" })).toContainText("골판지");
    await expect(page.getByText(/데모\(mock\) 모드/)).toBeVisible();
    await page.getByRole("button", { name: "맞아요" }).click();
    await page.getByRole("button", { name: "골판지 상자" }).click();
    await expect(page.getByRole("region", { name: "골판지 상자 배출 체크리스트" })).toBeVisible();
    await expect(page.getByText("테이프·송장·스티로폼을 모두 제거합니다.")).toBeVisible();
    await page.getByRole("button", { name: "처음부터 다시" }).click();
    await expect(page.getByText("이미지를 끌어놓거나 선택하세요")).toBeVisible();
  });

  test("사용자 수정 결과를 실제 feedback endpoint에 저장한다", async ({ page }) => {
    let feedbackRequest: Request | undefined;
    page.on("request", (request) => {
      if (request.url().endsWith("/feedback")) feedbackRequest = request;
    });
    await selectImage(page);
    await analyze(page);
    await page.getByRole("button", { name: "다른 종류 선택" }).click();
    await page.getByRole("button", { name: "플라스틱" }).click();
    await page.getByRole("button", { name: "플라스틱 용기" }).click();
    await expect(page.getByRole("region", { name: "플라스틱 용기 배출 체크리스트" })).toBeVisible();
    await expect.poll(() => feedbackRequest?.postDataJSON()).toMatchObject({
      selectedClass: "plastic",
      subcategory: "plastic-container",
      reason: "user_correction",
    });
  });

  test("저신뢰도 결과에서 직접 선택 경로를 제공한다", async ({ page }) => {
    await selectImage(page, LOW_CONFIDENCE_PNG, "uncertain.png");
    await analyze(page);
    await expect(page.getByRole("status")).toContainText("정확히 판단하기 어렵습니다");
    await expect(page.getByRole("button", { name: "다른 종류 선택" })).toBeVisible();
  });

  test("지원하지 않는 파일과 8 MiB 초과 파일을 클라이언트에서 거부한다", async ({
    page,
  }) => {
    await selectImage(page, Buffer.from("not an image"), "not-image.txt", "text/plain");
    await expect(appAlert(page)).toContainText("JPG, PNG 또는 WebP");
    await page.getByRole("button", { name: "다시 시도" }).click();
    await page.getByLabel("파일 선택").setInputFiles({
      name: "too-large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(MAX_UPLOAD_BYTES + 1),
    });
    await expect(appAlert(page)).toContainText("8 MiB 이하");
  });

  test("API 500과 연결 실패에서 재시도 UI를 유지한다", async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/v1/classifications`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "분석 서버 오류",
            requestId: "e2e-500",
            details: null,
          },
        }),
      }),
    );
    await selectImage(page);
    await page.getByRole("button", { name: "분석하기" }).click();
    await expect(appAlert(page)).toContainText("분석 서버 오류");
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();

    await page.unroute(`${API_BASE_URL}/api/v1/classifications`);
    await page.route(`${API_BASE_URL}/api/v1/classifications`, (route) => route.abort("failed"));
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(appAlert(page)).toContainText(/연결|요청|분석/);
  });

  test("유효하지 않은 API 응답을 구조화된 오류로 표시한다", async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/v1/classifications`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await selectImage(page);
    await page.getByRole("button", { name: "분석하기" }).click();
    await expect(appAlert(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  test("가이드 조회 실패를 오류 상태로 전환한다", async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/v1/guides/cardboard`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "GUIDE_UNAVAILABLE",
            message: "가이드를 불러오지 못했습니다.",
            requestId: "e2e-guide",
            details: null,
          },
        }),
      }),
    );
    await selectImage(page);
    await analyze(page);
    await page.getByRole("button", { name: "맞아요" }).click();
    await expect(appAlert(page)).toContainText("가이드를 불러오지 못했습니다");
  });

  test("피드백 실패가 가이드 사용을 막지 않는다", async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/v1/classifications/*/feedback`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "FEEDBACK_FAILED",
            message: "피드백 저장 오류",
            requestId: "e2e-feedback",
            details: null,
          },
        }),
      }),
    );
    await selectImage(page);
    await analyze(page);
    await page.getByRole("button", { name: "맞아요" }).click();
    await page.getByRole("button", { name: "골판지 상자" }).click();
    await expect(page.getByRole("region", { name: "골판지 상자 배출 체크리스트" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("피드백 저장에 실패했습니다");
  });
});
