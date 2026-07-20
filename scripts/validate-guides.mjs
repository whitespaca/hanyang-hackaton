import { readFile } from "node:fs/promises";

const EXPECTED = ["metal", "glass", "biological", "paper", "battery", "trash", "cardboard", "shoes", "clothes", "plastic"];
const RECYCLABILITY = new Set(["yes", "conditional", "no", "special"]);
const SPOT_TYPES = new Set(["battery-box", "bulky-waste", "clothes-bin", "cup-bin", "donation-center", "food-waste-bin", "general-waste", "glass-bin", "hazardous-waste", "health-center", "lamp-box", "manufacturer-takeback", "medicine-box", "non-combustible-waste", "paper-bin", "paper-cup-bin", "paper-pack-bin", "pet-bottle-bin", "plastic-bin", "recycling-station", "reuse-box", "small-electronics", "styrofoam-bin", "textile-collection", "vinyl-bin"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const path = new URL("../data/disposal-guides.ko.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
const errors = [];

const normalize = (value) => value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
const categories = data.categories ?? [];
const categoryIds = categories.map((category) => category.id);
if (JSON.stringify(categoryIds) !== JSON.stringify(EXPECTED)) errors.push("category order가 canonical 10-class order와 다릅니다.");

const items = data.items ?? [];
if (items.length < 40 || items.length > 50) errors.push(`item count는 40~50이어야 합니다: ${items.length}`);
const ids = new Set();
const names = new Map();
const aliases = new Map();
const categoryCounts = new Map(EXPECTED.map((id) => [id, 0]));
let popularCount = 0;

for (const item of items) {
  const label = item?.id ?? "<missing-id>";
  if (!ID_PATTERN.test(label)) errors.push(`${label}: id는 kebab-case여야 합니다.`);
  if (ids.has(label)) errors.push(`${label}: duplicate id`);
  ids.add(label);
  const normalizedName = normalize(item.nameKo ?? "");
  if (!normalizedName) errors.push(`${label}: nameKo가 비어 있습니다.`);
  if (names.has(normalizedName)) errors.push(`${label}: duplicate normalized name (${names.get(normalizedName)})`);
  names.set(normalizedName, label);
  for (const alias of item.aliases ?? []) {
    const normalizedAlias = normalize(alias);
    if (!normalizedAlias) errors.push(`${label}: 빈 alias`);
    if (normalizedAlias === normalizedName) errors.push(`${label}: alias가 nameKo와 중복됩니다 (${alias})`);
    const owner = aliases.get(normalizedAlias);
    if (owner && owner !== label) errors.push(`${label}: duplicate normalized alias (${alias}, ${owner})`);
    if (names.has(normalizedAlias) && names.get(normalizedAlias) !== label) errors.push(`${label}: alias가 다른 item name과 충돌합니다 (${alias})`);
    aliases.set(normalizedAlias, label);
  }
  if (item.classificationCategory !== null && !EXPECTED.includes(item.classificationCategory)) errors.push(`${label}: invalid classificationCategory`);
  if (item.classificationCategory) categoryCounts.set(item.classificationCategory, (categoryCounts.get(item.classificationCategory) ?? 0) + 1);
  if (!RECYCLABILITY.has(item.recyclability)) errors.push(`${label}: invalid recyclability`);
  if (!Array.isArray(item.steps) || item.steps.length < 2 || item.steps.some((value) => !value?.trim())) errors.push(`${label}: steps 2개 이상이 필요합니다.`);
  if (!Array.isArray(item.warnings) || item.warnings.length < 1 || item.warnings.some((value) => !value?.trim())) errors.push(`${label}: warning이 필요합니다.`);
  if (!Array.isArray(item.reasons) || item.reasons.length < 1 || item.reasons.some((reason) => !reason?.title?.trim() || !reason?.explanation?.trim())) errors.push(`${label}: reason title/explanation이 필요합니다.`);
  if (!item.summary?.trim()) errors.push(`${label}: summary가 필요합니다.`);
  if (!item.regionalNote?.trim()) errors.push(`${label}: regionalNote가 필요합니다.`);
  if (!item.source?.name?.trim() || !ISO_DATE.test(item.source?.checkedAt ?? "")) errors.push(`${label}: source.name과 ISO checkedAt이 필요합니다.`);
  if (!Array.isArray(item.keywords) || item.keywords.length < 1 || item.keywords.some((value) => !value?.trim())) errors.push(`${label}: keywords가 필요합니다.`);
  if (!Array.isArray(item.spotTypes) || item.spotTypes.length < 1) errors.push(`${label}: spotTypes가 최소 1개 필요합니다.`);
  else {
    if (new Set(item.spotTypes).size !== item.spotTypes.length) errors.push(`${label}: duplicate spotTypes`);
    for (const spotType of item.spotTypes) if (!SPOT_TYPES.has(spotType)) errors.push(`${label}: unknown spotType (${spotType})`);
  }
  if (item.popular === true) popularCount += 1;
}

for (const [category, count] of categoryCounts) if (count < 1) errors.push(`${category}: AI guide item이 최소 1개 필요합니다.`);
if (popularCount < 5) errors.push(`popular item이 최소 5개 필요합니다: ${popularCount}`);
if (!data.disclaimer?.trim()) errors.push("disclaimer가 없습니다.");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`가이드 검증 완료: ${categories.length}개 카테고리, ${items.length}개 품목, popular ${popularCount}개`);
