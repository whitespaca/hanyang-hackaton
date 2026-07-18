import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, ErrorState, PredictionList, Screen } from "@/components/ui";
import { useFlow } from "@/features/classification/FlowContext";
import { apiClient } from "@/lib/api";
import { theme } from "@/lib/theme";

export default function ResultScreen() {
  const { state, dispatch } = useFlow(); const result = state.result; const top = result?.predictions[0];
  if (!result || !top) return <Screen><ErrorState message="분석 결과가 없습니다." onRetry={() => router.replace("/")} /></Screen>;
  const topPrediction = top;
  async function confirm() { dispatch({ type: "class", selectedClass: topPrediction.className }); const category = await apiClient.getCategory(topPrediction.className); dispatch({ type: "category", category }); router.push("/refine"); }
  return <Screen><Text style={styles.eyebrow}>TOP 3 PREDICTION</Text><Text style={styles.title}>AI가 이렇게 예측했어요</Text>{result.needsConfirmation && <View accessibilityRole="alert" style={styles.warning}><Text style={styles.warningTitle}>정확히 판단하기 어렵습니다.</Text><Text style={styles.body}>아래 결과를 참고해 직접 종류를 선택해주세요.</Text></View>}<PredictionList predictions={result.predictions} threshold={result.confidenceThreshold} /><ActionButton label="맞아요" onPress={() => void confirm()} /><ActionButton label="다른 종류 선택" variant="secondary" onPress={() => { dispatch({ type: "class" }); router.push("/refine"); }} /><Text style={styles.mode}>{result.model.inferenceMode === "mock" ? "데모(mock)" : "실제 모델"} 모드 · {result.model.version}</Text></Screen>;
}
const styles = StyleSheet.create({ eyebrow: { color: theme.color.primary, fontWeight: "900", letterSpacing: 1 }, title: { fontSize: 30, lineHeight: 38, fontWeight: "900", color: theme.color.text }, warning: { padding: 16, backgroundColor: theme.color.warningBackground, borderRadius: 14 }, warningTitle: { color: theme.color.warning, fontWeight: "900" }, body: { color: theme.color.muted, lineHeight: 22 }, mode: { color: theme.color.muted, fontSize: 12, textAlign: "center" } });
