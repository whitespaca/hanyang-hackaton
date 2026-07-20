"use client";

import {
  GARBAGE_CLASSES,
  GARBAGE_LABELS,
  formatConfidence,
  type ClassificationPrediction,
  type GarbageClass,
  type GuideCategory,
  type DisposalItem,
  COLLECTION_SPOT_TYPE_METADATA,
} from "@bunrishot/shared";
import Image from "next/image";
import { useId, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { PrimaryButton } from "./PrimaryButton";

export function UploadDropzone({ onSelect, disabled = false }: { onSelect: (file: File) => void; disabled?: boolean }) {
  const inputId = useId();
  const pick = (files: FileList | null) => { const file = files?.[0]; if (file) onSelect(file); };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!disabled) pick(event.dataTransfer.files); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !disabled) {
      event.preventDefault(); document.getElementById(inputId)?.click();
    }
  };
  return (
    <div role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onKeyDown={onKeyDown}
      style={{ border: "2px dashed #9bb5aa", borderRadius: 20, minHeight: 230, display: "grid", placeItems: "center", textAlign: "center", padding: 28, background: "#f9fcfa", cursor: disabled ? "not-allowed" : "pointer" }}>
      <div>
        <div aria-hidden style={{ fontSize: 42 }}>▧</div>
        <strong style={{ display: "block", fontSize: 20, marginBottom: 8 }}>이미지를 끌어놓거나 선택하세요</strong>
        <span className="muted">JPG, PNG, WebP · 최대 8 MiB</span>
        <label htmlFor={inputId} className="button button-primary" style={{ marginTop: 20 }}>파일 선택</label>
        <input id={inputId} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event: ChangeEvent<HTMLInputElement>) => pick(event.target.files)} />
      </div>
    </div>
  );
}

export function ImagePreview({ src, fileName }: { src: string; fileName: string }) {
  return <figure style={{ margin: 0 }}><Image unoptimized width={800} height={600} src={src} alt={`분석할 이미지 미리보기: ${fileName}`} style={{ width: "100%", height: "auto", maxHeight: 440, objectFit: "contain", borderRadius: 18, background: "#edf1ef" }} /><figcaption className="muted" style={{ marginTop: 8, fontSize: 13 }}>{fileName}</figcaption></figure>;
}

export function ConfidenceBadge({ confidence, threshold }: { confidence: number; threshold: number }) {
  const low = confidence < threshold;
  return <span aria-label={`신뢰도 ${formatConfidence(confidence)}, ${low ? "확인 필요" : "높은 편"}`} style={{ color: low ? "var(--warning)" : "var(--primary-dark)", background: low ? "var(--warning-bg)" : "var(--accent)", borderRadius: 999, padding: "6px 10px", fontWeight: 800 }}>{formatConfidence(confidence)} · {low ? "확인 필요" : "높은 편"}</span>;
}

export function PredictionList({ predictions, threshold }: { predictions: ClassificationPrediction[]; threshold: number }) {
  return <ol aria-label="AI 예측 Top 3" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>{predictions.map((item, index) => <li key={item.className} style={{ display: "grid", gap: 7 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{index + 1}. {item.labelKo}</strong>{index === 0 ? <ConfidenceBadge confidence={item.confidence} threshold={threshold} /> : <span>{formatConfidence(item.confidence)}</span>}</div><div aria-hidden style={{ height: 9, borderRadius: 99, background: "#e7ece9", overflow: "hidden" }}><div style={{ width: formatConfidence(item.confidence), height: "100%", background: index === 0 ? "var(--primary)" : "#8ba99c" }} /></div></li>)}</ol>;
}

export function ClassPicker({ onSelect }: { onSelect: (value: GarbageClass) => void }) {
  return <div className="grid-cards" aria-label="쓰레기 종류 선택">{GARBAGE_CLASSES.map((value) => <button key={value} className="button button-secondary" onClick={() => onSelect(value)}>{GARBAGE_LABELS[value]}</button>)}</div>;
}

export function SubcategoryPicker({ category, onSelect }: { category: GuideCategory; onSelect: (subcategory: string) => void }) {
  return <div style={{ display: "grid", gap: 10 }}>{category.subcategories.map((item) => <button key={item.subcategory} onClick={() => onSelect(item.subcategory)} className="card" style={{ border: "1px solid var(--border)", padding: 18, textAlign: "left", cursor: "pointer" }}><strong>{item.title}</strong><span className="muted" style={{ display: "block", marginTop: 5 }}>{item.keywords.slice(0, 3).join(" · ")}</span></button>)}</div>;
}

const RECYCLABILITY_LABELS = { yes: "재활용 가능", conditional: "조건부 가능", no: "일반·별도 폐기", special: "전용 수거 필요" } as const;

export function GuideChecklist({ guide }: { guide: DisposalItem }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return <section aria-label={`${guide.nameKo} 배출 체크리스트`}><span className="eyebrow">{RECYCLABILITY_LABELS[guide.recyclability]}</span><h2 style={{ margin: "8px 0 8px" }}>{guide.nameKo}</h2><p>{guide.summary}</p>{guide.warnings.length > 0 && <div role="alert" style={{ margin: "18px 0", background: "var(--warning-bg)", padding: 16, borderRadius: 12 }}><strong>먼저 확인하세요</strong><ul>{guide.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}<h3>단계별 배출 체크리스트</h3><div style={{ display: "grid", gap: 12 }}>{guide.steps.map((step, index) => <label key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, background: "#f6f9f7", borderRadius: 12 }}><input aria-label={`${index + 1}단계 완료`} type="checkbox" checked={checked.has(index)} onChange={() => setChecked((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} style={{ width: 20, height: 20 }} /><span><strong>{index + 1}.</strong> {step}</span></label>)}</div><h3>왜 이렇게 버려야 하나요?</h3>{guide.reasons.map((reason) => <div key={reason.title}><strong>{reason.title}</strong><p className="muted">{reason.explanation}</p></div>)}<h3>배출 장소 유형</h3><p>{guide.spotTypes.map((spot) => COLLECTION_SPOT_TYPE_METADATA[spot].labelKo).join(" · ")}</p><div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16 }}><strong>지역별 기준 확인</strong><p className="muted">{guide.regionalNote}</p><p className="muted" style={{ fontSize: 14 }}>출처: {guide.source.url ? <a href={guide.source.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{guide.source.name}</a> : guide.source.name} · 확인일 {guide.source.checkedAt}</p></div></section>;
}

export function ApiErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="card" style={{ borderColor: "#e2b6b6", padding: 22 }}><strong style={{ color: "var(--danger)" }}>진행할 수 없습니다</strong><p>{message}</p>{onRetry && <PrimaryButton onClick={onRetry}>다시 시도</PrimaryButton>}</div>;
}
