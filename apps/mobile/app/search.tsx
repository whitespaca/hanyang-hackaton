import type { ItemSummary, RecentSearchItem } from "@bunrishot/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ErrorState, Screen } from "@/components/ui";
import { addRecentSearch, clearRecentSearches, deleteRecentSearch, loadRecentSearches } from "@/features/search/recentSearches";
import { apiClient } from "@/lib/api";
import { theme } from "@/lib/theme";

const SEARCH_DELAY_MS = 200;

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const sequence = useRef(0);
  const [query, setQuery] = useState(params.q ?? "");
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [suggestions, setSuggestions] = useState<ItemSummary[]>([]);
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);
  const [loading, setLoading] = useState(Boolean(params.q?.trim()));
  const [error, setError] = useState("");

  useEffect(() => { void loadRecentSearches().then(setRecent); }, []);
  useEffect(() => {
    const trimmed = query.trim();
    const current = ++sequence.current;
    if (!trimmed) return;
    const timer = setTimeout(() => {
      apiClient.searchItems(trimmed, 8).then((response) => {
        if (sequence.current !== current) return;
        setResults(response.results); setSuggestions(response.suggestions);
      }).catch((caught: unknown) => {
        if (sequence.current !== current) return;
        setResults([]); setSuggestions([]); setError(caught instanceof Error ? caught.message : "검색 결과를 불러오지 못했습니다.");
      }).finally(() => { if (sequence.current === current) setLoading(false); });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  async function openItem(item: ItemSummary) {
    try {
      setRecent(await addRecentSearch({ itemId: item.id, query: query.trim() || item.nameKo, nameKo: item.nameKo, searchedAt: new Date().toISOString() }));
    } catch {
      // Local history failure must not block guide access.
    }
    router.push({ pathname: "/item/[itemId]", params: { itemId: item.id } });
  }

  function onQueryChange(value: string) {
    sequence.current += 1;
    setQuery(value);
    setResults([]);
    setSuggestions([]);
    setError("");
    setLoading(Boolean(value.trim()));
  }

  const noResult = query.trim() && !loading && !error && results.length === 0 && suggestions.length === 0;
  return <Screen><Text style={styles.title}>품목 검색</Text><Text style={styles.body}>정확한 이름을 몰라도 비슷한 표현을 찾아드립니다.</Text><TextInput accessibilityLabel="품목 이름" value={query} onChangeText={onQueryChange} onSubmitEditing={() => { const first = results[0] ?? suggestions[0]; if (first) void openItem(first); }} placeholder="예: 보조배터리, 우유팩" returnKeyType="search" style={styles.input} />{loading && <Text accessibilityLiveRegion="polite" style={styles.body}>검색 중…</Text>}{error && <ErrorState message={error} />}{noResult && <Text accessibilityRole="alert" style={styles.empty}>검색 결과가 없습니다. 다른 이름으로 검색해 보세요.</Text>}{results.length > 0 && <ResultList title="검색 결과" items={results} onSelect={openItem} />}{suggestions.length > 0 && <ResultList title="혹시 이것을 찾으셨나요?" items={suggestions} onSelect={openItem} />}{!query && recent.length > 0 && <View><View style={styles.row}><Text style={styles.sectionTitle}>최근 검색</Text><Pressable accessibilityRole="button" onPress={() => void clearRecentSearches().then(setRecent)}><Text style={styles.link}>전체 삭제</Text></Pressable></View>{recent.map((item) => <View key={item.itemId} style={styles.recentRow}><Pressable onPress={() => router.push({ pathname: "/item/[itemId]", params: { itemId: item.itemId } })}><Text style={styles.resultTitle}>{item.nameKo}</Text></Pressable><Pressable accessibilityLabel={`${item.nameKo} 최근 검색 삭제`} onPress={() => void deleteRecentSearch(item.itemId).then(setRecent)}><Text style={styles.link}>삭제</Text></Pressable></View>)}</View>}</Screen>;
}

function ResultList({ title, items, onSelect }: { title: string; items: ItemSummary[]; onSelect: (item: ItemSummary) => Promise<void> }) {
  return <View><Text style={styles.sectionTitle}>{title}</Text>{items.map((item) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.nameKo} 상세 보기`} key={item.id} style={styles.result} onPress={() => void onSelect(item)}><Text style={styles.resultTitle}>{item.nameKo}</Text><Text style={styles.body}>{item.groupLabel} · {item.summary}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({ title: { fontSize: 30, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, lineHeight: 22 }, input: { minHeight: 52, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md, paddingHorizontal: 16, backgroundColor: theme.color.surface, color: theme.color.text }, sectionTitle: { fontSize: 18, fontWeight: "900", color: theme.color.text, marginVertical: 10 }, result: { padding: 15, backgroundColor: theme.color.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border, marginBottom: 8 }, resultTitle: { color: theme.color.text, fontWeight: "800", fontSize: 16 }, empty: { color: theme.color.muted, padding: 20, textAlign: "center" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, recentRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.color.border }, link: { color: theme.color.primary, fontWeight: "800", padding: 10 } });
