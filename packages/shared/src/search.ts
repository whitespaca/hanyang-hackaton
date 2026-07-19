import type { RecentSearchItem } from "./schemas";

export const RECENT_SEARCH_LIMIT = 20;

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function upsertRecentSearch(
  items: readonly RecentSearchItem[],
  next: RecentSearchItem,
  limit = RECENT_SEARCH_LIMIT,
): RecentSearchItem[] {
  if (limit <= 0) return [];
  return [next, ...items.filter((item) => item.itemId !== next.itemId)]
    .sort((a, b) => b.searchedAt.localeCompare(a.searchedAt))
    .slice(0, limit);
}

export function removeRecentSearch(
  items: readonly RecentSearchItem[],
  itemId: string,
): RecentSearchItem[] {
  return items.filter((item) => item.itemId !== itemId);
}
