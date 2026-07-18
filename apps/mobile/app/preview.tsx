import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text } from "react-native";
import { ActionButton, ErrorState, Screen } from "@/components/ui";
import { useFlow } from "@/features/classification/FlowContext";
import { apiClient } from "@/lib/api";
import { calculateResizeDimensions, UPLOAD_JPEG_QUALITY } from "@/lib/imageProcessing";
import { theme } from "@/lib/theme";

export default function PreviewScreen() {
  const { state, dispatch } = useFlow(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  if (!state.image) return <Screen><ErrorState message="선택한 이미지가 없습니다." onRetry={() => router.replace("/")} /></Screen>;
  async function analyze() { if (!state.image || loading) return; setLoading(true); setError(""); try { const context = ImageManipulator.manipulate(state.image.uri); const dimensions = calculateResizeDimensions(state.image.width, state.image.height); if (dimensions.width !== state.image.width || dimensions.height !== state.image.height) context.resize(dimensions); const rendered = await context.renderAsync(); const compressed = await rendered.saveAsync({ compress: UPLOAD_JPEG_QUALITY, format: SaveFormat.JPEG }); dispatch({ type: "image", image: { uri: compressed.uri, width: compressed.width, height: compressed.height, fileName: "upload.jpg" } }); const response = await fetch(compressed.uri); if (!response.ok) throw new Error("압축한 이미지를 읽을 수 없습니다."); const blob = await response.blob(); const result = await apiClient.classify({ image: blob, fileName: "upload.jpg", client: "mobile" }); dispatch({ type: "result", result }); router.replace("/result"); } catch (caught) { setError(caught instanceof Error ? caught.message : "분석할 수 없습니다. 네트워크를 확인해주세요."); } finally { setLoading(false); } }
  return <Screen><Image source={{ uri: state.image.uri }} accessibilityLabel="분석할 사진 미리보기" resizeMode="contain" style={styles.image} /><Text style={styles.title}>이 사진을 분석할까요?</Text><Text style={styles.body}>긴 변을 최대 1280px로 줄인 복사본만 API에 전송하며 원본은 저장하지 않습니다.</Text>{error && <ErrorState message={error} onRetry={analyze} />}<ActionButton label={loading ? "분석 중…" : "분석하기"} disabled={loading} onPress={analyze} /><ActionButton label="다시 선택" variant="secondary" disabled={loading} onPress={() => router.back()} /></Screen>;
}
const styles = StyleSheet.create({ image: { width: "100%", height: 360, borderRadius: 18, backgroundColor: "#E7ECE9" }, title: { fontSize: 28, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, lineHeight: 22 } });
