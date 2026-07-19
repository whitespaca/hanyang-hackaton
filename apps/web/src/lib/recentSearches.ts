import {
  recentSearchItemSchema,
  removeRecentSearch,
  upsertRecentSearch,
  type RecentSearchItem,
} from "@bunrishot/shared";

export const RECENT_SEARCH_STORAGE_KEY = "bunrishot:recent-searches:v1";

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function loadRecentSearches(storage = browserStorage()): RecentSearchItem[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RECENT_SEARCH_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      const result = recentSearchItemSchema.safeParse(value);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function persist(items: RecentSearchItem[], storage = browserStorage()): RecentSearchItem[] {
  if (!storage) return items;
  try {
    storage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Local history is optional and must not block search or guide access.
  }
  return items;
}

export function saveRecentSearch(next: RecentSearchItem, storage = browserStorage()): RecentSearchItem[] {
  return persist(upsertRecentSearch(loadRecentSearches(storage), next), storage);
}

export function deleteRecentSearch(itemId: string, storage = browserStorage()): RecentSearchItem[] {
  return persist(removeRecentSearch(loadRecentSearches(storage), itemId), storage);
}

export function clearRecentSearches(storage = browserStorage()): RecentSearchItem[] {
  return persist([], storage);
}
