"use client";

import type { GuideItem, GuidesResponse } from "@bunrishot/shared";
import { useEffect, useMemo, useState } from "react";
import { ApiErrorState, GuideChecklist } from "@/components/classification";
import { apiClient } from "@/lib/api";

export default function GuidesPage() {
  const [data, setData] = useState<GuidesResponse>(); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<GuideItem>(); const [error, setError] = useState("");
  const load = () => { setError(""); apiClient.listGuides().then(setData).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "가이드를 불러오지 못했습니다.")); };
  useEffect(() => { apiClient.listGuides().then(setData).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "가이드를 불러오지 못했습니다.")); }, []);
  const items = useMemo(() => data?.categories.flatMap((category) => category.subcategories).filter((item) => `${item.title} ${item.category} ${item.keywords.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [], [data, query]);
  return <section className="section container"><p className="eyebrow">Disposal guides</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", margin: "8px 0" }}>품목별 배출 가이드</h1><p className="muted">사진 없이도 이름이나 키워드로 찾아볼 수 있습니다.</p><label style={{ display: "block", maxWidth: 620, margin: "28px 0" }}><span style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>품목 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 페트병, 티백, 보조배터리" style={{ width: "100%", minHeight: 50, border: "1px solid var(--border)", borderRadius: 12, padding: "0 16px", background: "white" }} /></label>{error && <ApiErrorState message={error} onRetry={load} />}{!data && !error && <p role="status">가이드를 불러오는 중입니다…</p>}{data && items.length === 0 && <div className="card" style={{ padding: 24 }}>검색 결과가 없습니다. 다른 이름이나 재질로 검색해보세요.</div>}<div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(240px,.75fr) minmax(300px,1.25fr)" : "1fr", gap: 24, alignItems: "start" }}><div className="grid-cards">{items.map((item) => <button className="card" key={`${item.category}/${item.subcategory}`} onClick={() => setSelected(item)} style={{ border: "1px solid var(--border)", padding: 20, textAlign: "left", cursor: "pointer" }}><span className="eyebrow">{item.category}</span><h2 style={{ fontSize: 20, margin: "6px 0" }}>{item.title}</h2><span className="muted">{item.keywords.slice(0,3).join(" · ")}</span></button>)}</div>{selected && <div className="card" style={{ padding: 26, position: "sticky", top: 90 }}><GuideChecklist guide={selected} /></div>}</div></section>;
}
