import { expect, test } from "@playwright/test";

test.describe("수거 장소", () => {
  test("위치 요청 없이 fixture 목록과 list-only fallback을 표시한다", async ({ page }) => {
    await page.goto("/spots");
    await expect(page.getByRole("heading", { name: "가까운 배출 장소" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "은행약국 인근 재활용 배출장소" })).toBeVisible();
    await expect(page.getByText(/시연용 장소 데이터/)).toBeVisible();
    await expect(page.getByText(/목록 전용 모드/)).toBeVisible();
  });

  test("허용된 현재 위치에서 거리순 목록을 표시한다", async ({ context, page }) => {
    await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:3100" });
    await context.setGeolocation({ latitude: 37.89273948, longitude: 127.755362 });
    await page.goto("/spots");
    await page.getByRole("button", { name: "현재 위치 사용" }).click();
    await expect(page.getByText(/10km 안의 장소/)).toBeVisible();
    await expect(page.getByText("0m")).toBeVisible();
  });

  test("위치 거부 후에도 목록을 유지한다", async ({ context, page }) => {
    await context.clearPermissions();
    await page.goto("/spots");
    await expect(page.getByRole("heading", { name: "은행약국 인근 재활용 배출장소" })).toBeVisible();
    await page.getByRole("button", { name: "현재 위치 사용" }).click();
    await expect(page.getByText("위치 권한 없이도 장소 목록과 외부 지도 검색을 사용할 수 있습니다.", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "은행약국 인근 재활용 배출장소" })).toBeVisible();
  });

  test("품목 상세 CTA가 해당 장소 유형 필터를 전달한다", async ({ page }) => {
    await page.goto("/items/power-bank");
    await page.getByRole("link", { name: "가까운 배출 장소 찾기" }).click();
    await expect(page).toHaveURL(/\/spots\?.*type=battery-box/);
    await expect(page.getByRole("button", { name: "폐건전지 수거함" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/조건에 맞는 fixture 장소가 없습니다/)).toBeVisible();
  });
});
