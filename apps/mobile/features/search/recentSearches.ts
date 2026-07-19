import AsyncStorage from "@react-native-async-storage/async-storage";
import { recentSearchItemSchema, removeRecentSearch, upsertRecentSearch, type RecentSearchItem } from "@bunrishot/shared";

export const RECENT_SEARCH_STORAGE_KEY = "bunrishot:recent-searches:v1";

export async function loadRecentSearches(): Promise<RecentSearchItem[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      const result = recentSearchItemSchema.safeParse(value);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

async function persist(items: RecentSearchItem[]): Promise<RecentSearchItem[]> {
  await AsyncStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(items));
  return items;
}

export async function addRecentSearch(item: RecentSearchItem): Promise<RecentSearchItem[]> {
  return persist(upsertRecentSearch(await loadRecentSearches(), item));
}

export async function deleteRecentSearch(itemId: string): Promise<RecentSearchItem[]> {
  return persist(removeRecentSearch(await loadRecentSearches(), itemId));
}

export async function clearRecentSearches(): Promise<RecentSearchItem[]> {
  await AsyncStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
  return [];
}
