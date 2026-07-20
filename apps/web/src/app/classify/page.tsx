"use client";

import { ALLOWED_IMAGE_TYPES, ApiClientError, MAX_UPLOAD_BYTES, type ClassificationResponse, type GarbageClass, type GuideCategory, type GuideItem } from "@bunrishot/shared";
import { useEffect, useMemo, useState } from "react";
import { ApiErrorState, ClassPicker, GuideChecklist, ImagePreview, PredictionList, SubcategoryPicker, UploadDropzone } from "@/components/classification";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiClient } from "@/lib/api";
import { CollectionSpotCta } from "@/components/spots/CollectionSpotCta";

type FlowState = "idle" | "preview" | "uploading" | "result" | "select-class" | "select-subcategory" | "guide" | "error";

export default function ClassifyPage() {
  const [state, setState] = useState<FlowState>("idle");
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [result, setResult] = useState<ClassificationResponse>();
  const [selectedClass, setSelectedClass] = useState<GarbageClass>();
  const [category, setCategory] = useState<GuideCategory>();
  const [guide, setGuide] = useState<GuideItem>();
  const [error, setError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const topPrediction = result?.predictions[0];
  const title = useMemo(() => ({ idle: "사진을 선택해주세요", preview: "이 사진을 분석할까요?", uploading: "이미지를 분석하고 있어요", result: "AI가 이렇게 예측했어요", "select-class": "실제 종류를 선택해주세요", "select-subcategory": "어떤 품목에 가까운가요?", guide: "배출 전 확인해주세요", error: "분석을 완료하지 못했어요" })[state], [state]);

  function selectFile(nextFile: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(nextFile.type as (typeof ALLOWED_IMAGE_TYPES)[number])) { setError("JPG, PNG 또는 WebP 파일을 선택해주세요."); setState("error"); return; }
    if (nextFile.size > MAX_UPLOAD_BYTES) { setError("이미지는 8 MiB 이하여야 합니다."); setState("error"); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile); setPreviewUrl(URL.createObjectURL(nextFile)); setError(""); setState("preview");
  }

  async function analyze() {
    if (!file || state === "uploading") return;
    setState("uploading"); setError("");
    try { setResult(await apiClient.classify({ image: file, fileName: file.name, client: "web" })); setState("result"); }
    catch (caught) { setError(caught instanceof ApiClientError ? caught.message : "분석 중 문제가 발생했습니다."); setState("error"); }
  }

  async function chooseClass(value: GarbageClass) {
    setSelectedClass(value); setError("");
    try { setCategory(await apiClient.getCategory(value)); setState("select-subcategory"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "가이드를 불러오지 못했습니다."); setState("error"); }
  }

  async function chooseSubcategory(value: string) {
    if (!selectedClass || !result || !topPrediction) return;
    try {
      const nextGuide = await apiClient.getGuide(selectedClass, value); setGuide(nextGuide); setState("guide");
      try { await apiClient.submitFeedback({ classificationId: result.classificationId, predictedClass: topPrediction.className, selectedClass, subcategory: value, reason: topPrediction.className === selectedClass ? "confirmed" : "user_correction" }); }
      catch (caught) { setFeedbackError(caught instanceof Error ? caught.message : "피드백을 저장하지 못했습니다."); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "상세 가이드를 불러오지 못했습니다."); setState("error"); }
  }

  function reset() { if (previewUrl) URL.revokeObjectURL(previewUrl); setState("idle"); setFile(undefined); setPreviewUrl(undefined); setResult(undefined); setSelectedClass(undefined); setCategory(undefined); setGuide(undefined); setError(""); setFeedbackError(""); }

  return <section className="section container" style={{ maxWidth: 820 }}><p className="eyebrow">AI classify</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", margin: "8px 0 12px" }}>{title}</h1><p className="muted" aria-live="polite">AI 예측은 참고 정보입니다. 결과를 확인하거나 직접 수정한 뒤 안내를 확인하세요.</p><div className="card" style={{ padding: "clamp(18px,4vw,34px)", marginTop: 28 }}><div key={state} className="flow-stage">
    {state === "idle" && <UploadDropzone onSelect={selectFile} />}
    {state === "preview" && previewUrl && file && <div style={{ display: "grid", gap: 18 }}><ImagePreview src={previewUrl} fileName={file.name} /><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><PrimaryButton onClick={analyze}>분석하기</PrimaryButton><PrimaryButton variant="secondary" onClick={reset}>다시 선택</PrimaryButton></div></div>}
    {state === "uploading" && <div role="status" aria-live="polite" style={{ textAlign: "center", padding: 50 }}><div style={{ fontSize: 42 }} aria-hidden>◌</div><strong>Top 3를 계산하는 중입니다…</strong><p className="muted">중복 제출을 막고 있습니다.</p></div>}
    {state === "result" && result && topPrediction && <div style={{ display: "grid", gap: 22 }}>{result.needsConfirmation && <div role="status" style={{ background: "var(--warning-bg)", padding: 16, borderRadius: 12 }}><strong>정확히 판단하기 어렵습니다.</strong><br />아래 결과를 참고해 직접 종류를 선택해주세요.</div>}<PredictionList predictions={result.predictions} threshold={result.confidenceThreshold} /><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><PrimaryButton onClick={() => chooseClass(topPrediction.className)}>맞아요</PrimaryButton><PrimaryButton variant="secondary" onClick={() => setState("select-class")}>다른 종류 선택</PrimaryButton></div><small className="muted">현재 {result.model.inferenceMode === "mock" ? "데모(mock)" : "실제 모델"} 모드 · {result.model.version}</small></div>}
    {state === "select-class" && <ClassPicker onSelect={chooseClass} />}
    {state === "select-subcategory" && category && <SubcategoryPicker category={category} onSelect={chooseSubcategory} />}
    {state === "guide" && guide && <div><GuideChecklist guide={guide} /><CollectionSpotCta item={guide} />{feedbackError && <p role="status" style={{ color: "var(--warning)" }}>가이드는 계속 사용할 수 있지만 피드백 저장에 실패했습니다: {feedbackError}</p>}<div style={{ marginTop: 12 }}><PrimaryButton onClick={reset}>처음부터 다시</PrimaryButton></div></div>}
    {state === "error" && <ApiErrorState message={error} onRetry={file ? analyze : reset} />}
  </div></div></section>;
}
