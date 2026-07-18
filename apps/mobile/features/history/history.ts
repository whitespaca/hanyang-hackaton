import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GarbageClass } from "@bunrishot/shared";

export interface HistoryItem {
  id: string;
  predictedClass: GarbageClass;
  selectedClass: GarbageClass;
  subcategory?: string;
  confidence: number;
  createdAt: string;
}

const STORAGE_KEY = "bunrishot:history:v1";
export const HISTORY_LIMIT = 20;

export function limitHistory(items: HistoryItem[]): HistoryItem[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, HISTORY_LIMIT);
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return limitHistory(parsed.filter(isHistoryItem));
  } catch {
    return [];
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.predictedClass === "string" && typeof item.selectedClass === "string" && typeof item.confidence === "number" && typeof item.createdAt === "string";
}

export async function addHistory(item: HistoryItem): Promise<void> {
  const current = await loadHistory();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limitHistory([item, ...current])));
}
