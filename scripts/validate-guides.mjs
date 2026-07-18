import { readFile } from "node:fs/promises";

const EXPECTED = [
  "metal", "glass", "biological", "paper", "battery",
  "trash", "cardboard", "shoes", "clothes", "plastic",
];
const RECYCLABILITY = new Set(["yes", "conditional", "no", "special"]);
const path = new URL("../data/disposal-guides.ko.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
const errors = [];
const categoryIds = new Set();
const subcategoryIds = new Set();

for (const category of data.categories ?? []) {
  if (categoryIds.has(category.id)) errors.push(`중복 category: ${category.id}`);
  categoryIds.add(category.id);
  for (const item of category.subcategories ?? []) {
    const key = `${category.id}/${item.id}`;
    if (subcategoryIds.has(key)) errors.push(`중복 subcategory: ${key}`);
    subcategoryIds.add(key);
    if (!RECYCLABILITY.has(item.recyclability)) errors.push(`잘못된 recyclability: ${key}`);
    if (!Array.isArray(item.steps) || item.steps.length < 2) errors.push(`steps 2개 미만: ${key}`);
    if (!Array.isArray(item.keywords) || item.keywords.some((value) => !value.trim())) {
      errors.push(`keywords 오류: ${key}`);
    }
  }
}

for (const expected of EXPECTED) {
  if (!categoryIds.has(expected)) errors.push(`누락 category: ${expected}`);
}
if (categoryIds.size !== EXPECTED.length) errors.push("예상하지 않은 category가 있습니다.");
if (typeof data.disclaimer !== "string" || !data.disclaimer.trim()) errors.push("disclaimer가 없습니다.");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`가이드 검증 완료: ${categoryIds.size}개 카테고리, ${subcategoryIds.size}개 세부 품목`);
