import { expect, test } from "@playwright/test";

import { createSolidPng } from "./fixture";

const FIXTURE_PNG = createSolidPng();

test("실제 모델 API로 Top 3부터 가이드까지 완료한다", async ({ page }) => {
  await page.goto("/classify");
  await page.getByLabel("파일 선택").setInputFiles({
    name: "actual-model-smoke.png",
    mimeType: "image/png",
    buffer: FIXTURE_PNG,
  });
  await expect(page.getByAltText(/actual-model-smoke\.png/)).toBeVisible();

  await page.getByRole("button", { name: "분석하기" }).click();
  const predictions = page.getByRole("list", { name: "AI 예측 Top 3" });
  await expect(predictions).toBeVisible();
  await expect(predictions.getByRole("listitem")).toHaveCount(3);
  await expect(
    page.getByText(/현재 실제 모델 모드 · gcv2-mobilenetv3s-/),
  ).toBeVisible();
  await expect(page.getByText(/데모\(mock\)/)).toHaveCount(0);

  await page.getByRole("button", { name: "맞아요" }).click();
  await expect(
    page.getByRole("heading", { name: "어떤 품목에 가까운가요?" }),
  ).toBeVisible();
  await page.locator(".flow-stage button").first().click();
  await expect(
    page.getByRole("region", { name: /배출 체크리스트/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "처음부터 다시" }).click();
  await expect(page.getByText("이미지를 끌어놓거나 선택하세요")).toBeVisible();
});
