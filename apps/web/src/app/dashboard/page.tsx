"use client";

import { GARBAGE_LABELS, formatConfidence, type StatisticsResponse } from "@bunrishot/shared";
import { useEffect, useState } from "react";
import { ApiErrorState } from "@/components/classification";
import { StatCard } from "@/components/StatCard";
import { apiClient } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<StatisticsResponse>(); const [error, setError] = useState("");
  const load = () => { setError(""); apiClient.getStatistics().then(setData).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "통계를 불러오지 못했습니다.")); };
  useEffect(() => { apiClient.getStatistics().then(setData).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "통계를 불러오지 못했습니다.")); }, []);
  return <section className="section container"><p className="eyebrow">Anonymous statistics</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", margin: "8px 0" }}>분리샷 사용 현황</h1><p className="muted">이미지 원본이나 사용자 식별 정보 없이 분류 요약만 집계합니다.</p>{error && <div style={{ marginTop: 24 }}><ApiErrorState message={error} onRetry={load} /></div>}{!data && !error && <p role="status">통계를 불러오는 중입니다…</p>}{data && <><div style={{ margin: "22px 0" }}><span style={{ background: data.dataMode === "demo" ? "var(--warning-bg)" : "var(--accent)", padding: "7px 11px", borderRadius: 999, fontWeight: 800 }}>{data.dataMode === "demo" ? "데모/빈 데이터" : "실제 익명 집계"}</span></div><div className="grid-cards"><StatCard label="총 분류" value={data.totalClassifications.toLocaleString()} helper="성공한 요청 기준" /><StatCard label="평균 Top 신뢰도" value={formatConfidence(data.averageTopConfidence)} /><StatCard label="사용자 수정률" value={formatConfidence(data.correctionRate)} /></div><section className="card" style={{ padding: 26, marginTop: 24 }}><h2>카테고리 분포</h2>{data.categoryCounts.length === 0 ? <p className="muted">아직 실제 분류 데이터가 없습니다. 첫 분류를 시작해보세요.</p> : <div style={{ display: "grid", gap: 12 }}>{data.categoryCounts.map((item) => <div key={item.className}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>{GARBAGE_LABELS[item.className]}</strong><span>{item.count}건</span></div><div style={{ background: "#e8edea", height: 9, borderRadius: 99 }}><div style={{ background: "var(--primary)", height: "100%", borderRadius: 99, width: `${Math.max(4, item.count / data.totalClassifications * 100)}%` }} /></div></div>)}</div>}</section></>}</section>;
}
