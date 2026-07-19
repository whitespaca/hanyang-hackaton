import { expect, test } from "@playwright/test";

async function searchFromHome(page: import("@playwright/test").Page, query: string) {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "이거 어떻게 버리지?" });
  await input.fill(query);
  return input;
}

test.describe("품목 catalog 검색", () => {
  test("홈 자동완성에서 상세 가이드와 최근 검색까지 이어진다", async ({ page }) => {
    const input = await searchFromHome(page, "보조배터리");
    await expect(page.getByRole("option").filter({ hasText: "보조배터리" })).toBeVisible();
    await input.press("ArrowDown");
    await input.press("Enter");

    await expect(page.getByRole("heading", { name: "보조배터리" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "단계별 배출 체크리스트" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "왜 이렇게 버려야 하나요?" })).toBeVisible();
    await expect(page.getByText(/출처: 기후에너지환경부 분리배출 정보조회 서비스/)).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("최근 검색")).toBeVisible();
    await expect(page.getByRole("button", { name: "보조배터리", exact: true })).toBeVisible();
  });

  test("alias 검색도 canonical 상세로 이동한다", async ({ page }) => {
    const input = await searchFromHome(page, "휴대용 배터리");
    await expect(page.getByRole("option").filter({ hasText: "보조배터리" })).toBeVisible();
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/items\/power-bank$/);
    await expect(page.getByRole("heading", { name: "보조배터리" })).toBeVisible();
  });

  test("오타는 유사 품목을 별도로 제안한다", async ({ page }) => {
    await searchFromHome(page, "보조베터리");
    await expect(page.getByText("혹시 이것을 찾으셨나요?")).toBeVisible();
    await expect(page.getByRole("option").filter({ hasText: "보조배터리" })).toBeVisible();
  });

  test("무관한 검색어에는 명확한 빈 상태를 표시한다", async ({ page }) => {
    await searchFromHome(page, "존재하지않는품목");
    await expect(page.getByText(/검색 결과가 없습니다/)).toBeVisible();
  });
});
