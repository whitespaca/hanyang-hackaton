import { readFile } from "node:fs/promises";

const SPOT_TYPES = new Set(["battery-box", "bulky-waste", "clothes-bin", "cup-bin", "donation-center", "food-waste-bin", "general-waste", "glass-bin", "hazardous-waste", "health-center", "lamp-box", "manufacturer-takeback", "medicine-box", "non-combustible-waste", "paper-bin", "paper-cup-bin", "paper-pack-bin", "pet-bottle-bin", "plastic-bin", "recycling-station", "reuse-box", "small-electronics", "styrofoam-bin", "textile-collection", "vinyl-bin"]);
const FINDABLE = new Set([...SPOT_TYPES].filter((type) => !["bulky-waste", "food-waste-bin", "general-waste", "manufacturer-takeback", "non-combustible-waste"].includes(type)));
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const data = JSON.parse(await readFile(new URL("../data/collection-spots.ko.json", import.meta.url), "utf8"));
const errors = [];
const ids = new Set();
const covered = new Set();

if (!data.version?.trim() || !data.locale?.trim() || !data.regionLabel?.trim() || !data.disclaimer?.trim()) errors.push("dataset metadata가 비어 있습니다.");
if (data.dataMode !== "fixture" && data.dataMode !== "live") errors.push("dataMode는 fixture 또는 live여야 합니다.");
if (!ISO_DATE.test(data.lastUpdated ?? "")) errors.push("lastUpdated는 ISO date여야 합니다.");
if (!data.source?.name?.trim() || !ISO_DATE.test(data.source?.checkedAt ?? "")) errors.push("dataset source.name/checkedAt이 필요합니다.");
if (data.source?.url !== null) { try { new URL(data.source.url); } catch { errors.push("dataset source.url이 유효하지 않습니다."); } }
if (!Array.isArray(data.spots) || data.spots.length < 10) errors.push(`fixture 장소는 최소 10개가 필요합니다: ${data.spots?.length ?? 0}`);

for (const spot of data.spots ?? []) {
  const label = spot?.id ?? "<missing-id>";
  if (!ID_PATTERN.test(label)) errors.push(`${label}: id는 kebab-case여야 합니다.`);
  if (ids.has(label)) errors.push(`${label}: duplicate id`);
  ids.add(label);
  if (!spot.nameKo?.trim() || !spot.address?.trim()) errors.push(`${label}: nameKo/address가 필요합니다.`);
  if (!Number.isFinite(spot.latitude) || spot.latitude < -90 || spot.latitude > 90) errors.push(`${label}: invalid latitude`);
  if (!Number.isFinite(spot.longitude) || spot.longitude < -180 || spot.longitude > 180) errors.push(`${label}: invalid longitude`);
  if (!Array.isArray(spot.spotTypes) || spot.spotTypes.length < 1) errors.push(`${label}: spotTypes가 필요합니다.`);
  else for (const type of spot.spotTypes) { if (!SPOT_TYPES.has(type)) errors.push(`${label}: unknown spotType (${type})`); else covered.add(type); }
  if (!spot.source?.name?.trim() || !ISO_DATE.test(spot.source?.checkedAt ?? "")) errors.push(`${label}: source.name/checkedAt이 필요합니다.`);
  if (spot.source?.url !== null) { try { new URL(spot.source.url); } catch { errors.push(`${label}: source.url이 유효하지 않습니다.`); } }
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const externalOnly = [...FINDABLE].filter((type) => !covered.has(type));
console.log(`장소 검증 완료: ${data.spots.length}개 장소, ${covered.size}개 유형 커버, ${externalOnly.length}개 external-only`);
if (externalOnly.length) console.log(`external-only: ${externalOnly.join(", ")}`);
