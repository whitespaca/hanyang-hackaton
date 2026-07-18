import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { ActionButton, ErrorState, GuideChecklist, Screen } from "@/components/ui";
import { useFlow } from "@/features/classification/FlowContext";
import { addHistory } from "@/features/history/history";
import { apiClient } from "@/lib/api";

export default function GuideScreen() {
  const { state, dispatch } = useFlow(); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const result = state.result; const top = result?.predictions[0];
  if (!state.guide || !state.selectedClass || !result || !top) return <Screen><ErrorState message="선택한 가이드가 없습니다." onRetry={() => router.replace("/")} /></Screen>;
  async function complete() { if (!state.guide || !state.selectedClass || !result || !top) return; setSaving(true); setError(""); const item = { id: result.classificationId, predictedClass: top.className, selectedClass: state.selectedClass, subcategory: state.guide.subcategory, confidence: top.confidence, createdAt: new Date().toISOString() }; try { await addHistory(item); await apiClient.submitFeedback({ classificationId: result.classificationId, predictedClass: top.className, selectedClass: state.selectedClass, subcategory: state.guide.subcategory, reason: top.className === state.selectedClass ? "confirmed" : "user_correction" }); dispatch({ type: "reset" }); router.dismissAll(); router.replace("/"); } catch (caught) { setError(caught instanceof Error ? caught.message : "기록 또는 피드백을 저장하지 못했습니다."); } finally { setSaving(false); } }
  return <Screen><GuideChecklist guide={state.guide} />{error && <ErrorState message={`가이드는 계속 확인할 수 있지만 저장에 실패했습니다. ${error}`} onRetry={complete} />}<ActionButton label={saving ? "저장 중…" : "배출 완료"} disabled={saving} onPress={complete} /><Text style={{ textAlign: "center", opacity: .6 }}>원본 이미지는 최근 기록에 저장되지 않습니다.</Text></Screen>;
}
