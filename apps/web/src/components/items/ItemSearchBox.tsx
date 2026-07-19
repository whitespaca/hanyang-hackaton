"use client";

import type { ItemSummary, RecentSearchItem } from "@bunrishot/shared";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { apiClient } from "@/lib/api";
import { clearRecentSearches, deleteRecentSearch, loadRecentSearches, saveRecentSearch } from "@/lib/recentSearches";

const DEBOUNCE_MS = 200;

export function ItemSearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const requestSequence = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [suggestions, setSuggestions] = useState<ItemSummary[]>([]);
  const [popular, setPopular] = useState<ItemSummary[]>([]);
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setRecent(loadRecentSearches());
    });
    apiClient.listItems().then(({ items }) => setPopular(items.filter((item) => item.popular).slice(0, 8))).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const sequence = ++requestSequence.current;
    if (!trimmed) return;
    const timer = window.setTimeout(() => {
      apiClient.searchItems(trimmed, 8)
        .then((response) => {
          if (requestSequence.current !== sequence) return;
          setResults(response.results); setSuggestions(response.suggestions);
        })
        .catch((caught: unknown) => {
          if (requestSequence.current !== sequence) return;
          setResults([]); setSuggestions([]);
          setError(caught instanceof Error ? caught.message : "검색 결과를 불러오지 못했습니다.");
        })
        .finally(() => { if (requestSequence.current === sequence) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const choices = [...results, ...suggestions];
  function openItem(item: ItemSummary, searchQuery = query.trim() || item.nameKo) {
    setRecent(saveRecentSearch({ itemId: item.id, query: searchQuery, nameKo: item.nameKo, searchedAt: new Date().toISOString() }));
    router.push(`/items/${encodeURIComponent(item.id)}`);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const item = choices[Math.max(0, activeIndex)];
    if (item) openItem(item);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(value + 1, choices.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(value - 1, 0)); }
    if (event.key === "Escape") { setResults([]); setSuggestions([]); setActiveIndex(-1); }
  }
  function onQueryChange(value: string) {
    requestSequence.current += 1;
    setQuery(value);
    setActiveIndex(-1);
    setError("");
    setResults([]);
    setSuggestions([]);
    setLoading(Boolean(value.trim()));
  }

  return <section className="card" style={{ padding: compact ? 20 : 28 }} aria-label="품목 검색">
    <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <label htmlFor={`${listId}-input`} className="eyebrow" style={{ width: "100%" }}>이거 어떻게 버리지?</label>
      <input id={`${listId}-input`} role="combobox" aria-controls={listId} aria-expanded={choices.length > 0} aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} value={query} onChange={(event) => onQueryChange(event.target.value)} onKeyDown={onKeyDown} placeholder="물건 이름을 입력하세요" style={{ flex: "1 1 240px", minHeight: 50, border: "1px solid var(--border)", borderRadius: 12, padding: "0 15px" }} />
      <button className="button button-primary" disabled={!query.trim() || loading}>{loading ? "검색 중…" : "검색"}</button>
    </form>
    <div role="status" aria-live="polite" className="muted" style={{ minHeight: 24, marginTop: 8 }}>{error || (loading ? "품목을 찾고 있습니다." : "")}</div>
    {query.trim() && !loading && !error && choices.length === 0 && <p role="status">검색 결과가 없습니다. 다른 이름이나 더 짧은 단어로 검색해 보세요.</p>}
    {results.length > 0 && <div><strong>검색 결과</strong><ul id={listId} role="listbox" style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>{results.map((item, index) => <ResultButton key={item.id} item={item} id={`${listId}-${index}`} active={activeIndex === index} onSelect={() => openItem(item)} />)}</ul></div>}
    {suggestions.length > 0 && <div><strong>혹시 이것을 찾으셨나요?</strong><ul role="listbox" style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>{suggestions.map((item, index) => <ResultButton key={item.id} item={item} id={`${listId}-${results.length + index}`} active={activeIndex === results.length + index} onSelect={() => openItem(item)} />)}</ul></div>}
    {!query && popular.length > 0 && <div><strong>자주 찾는 품목</strong><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{popular.map((item) => <button className="button button-secondary" key={item.id} onClick={() => openItem(item, item.nameKo)}>{item.nameKo}</button>)}</div></div>}
    {!query && recent.length > 0 && <div style={{ marginTop: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>최근 검색</strong><button onClick={() => setRecent(clearRecentSearches())} className="button button-secondary">전체 삭제</button></div><ul style={{ listStyle: "none", padding: 0 }}>{recent.slice(0, compact ? 4 : 20).map((item) => <li key={item.itemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}><button onClick={() => router.push(`/items/${item.itemId}`)} style={{ border: 0, background: "transparent", padding: "14px 0", cursor: "pointer", fontWeight: 700 }}>{item.nameKo}</button><button aria-label={`${item.nameKo} 최근 검색 삭제`} onClick={() => setRecent(deleteRecentSearch(item.itemId))} style={{ border: 0, background: "transparent", cursor: "pointer" }}>삭제</button></li>)}</ul></div>}
  </section>;
}

function ResultButton({ item, id, active, onSelect }: { item: ItemSummary; id: string; active: boolean; onSelect: () => void }) {
  return <li id={id} role="option" aria-selected={active}><button type="button" onClick={onSelect} style={{ width: "100%", padding: 13, textAlign: "left", borderRadius: 10, border: "1px solid var(--border)", background: active ? "var(--accent)" : "white", cursor: "pointer" }}><strong>{item.nameKo}</strong><span className="muted" style={{ display: "block", marginTop: 3 }}>{item.groupLabel} · {item.summary}</span></button></li>;
}
