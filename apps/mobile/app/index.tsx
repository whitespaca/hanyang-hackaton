import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, ErrorState, Screen } from "@/components/ui";
import { NetworkDiagnostics } from "@/components/NetworkDiagnostics";
import { useFlow } from "@/features/classification/FlowContext";
import { loadHistory, type HistoryItem } from "@/features/history/history";
import { theme } from "@/lib/theme";
import { getPermissionUiState } from "@/lib/permissions";

export default function HomeScreen() {
  const { dispatch } = useFlow(); const [history, setHistory] = useState<HistoryItem[]>([]); const [error, setError] = useState("");
  useFocusEffect(useCallback(() => { loadHistory().then(setHistory).catch(() => setError("최근 기록을 불러오지 못했습니다.")); }, []));
  async function pickImage() {
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const permissionState = getPermissionUiState(permission);
      if (permissionState !== "granted") { setError(permissionState === "restricted" ? "사진 권한이 제한되었습니다. 설정에서 허용하거나 카메라를 사용해주세요." : "사진 권한이 거절되었습니다. 다시 허용하거나 카메라를 사용해주세요."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0]; if (!asset?.uri) { setError("선택한 사진을 읽을 수 없습니다."); return; }
      dispatch({ type: "image", image: { uri: asset.uri, width: asset.width, height: asset.height, ...(asset.fileName ? { fileName: asset.fileName } : {}) } }); router.push("/preview");
    } catch { setError("갤러리를 열 수 없습니다. 권한을 확인하고 다시 시도해주세요."); }
  }
  return <Screen><View style={styles.hero}><Text style={styles.eyebrow}>AI 분리배출 도우미</Text><Text style={styles.title}>사진 한 장으로{`\n`}배출 방법까지</Text><Text style={styles.body}>AI의 Top 3를 확인하고, 실제 품목은 직접 선택해 안전한 안내를 받으세요.</Text></View>{error && <ErrorState message={error} />}<ActionButton label="사진 촬영" onPress={() => router.push("/capture")} /><ActionButton label="갤러리에서 선택" variant="secondary" onPress={pickImage} /><View style={styles.tip}><Text style={styles.tipTitle}>촬영 팁</Text><Text style={styles.body}>밝은 곳에서 물건 하나만 화면 가운데 크게 담아주세요.</Text></View>{__DEV__ && <NetworkDiagnostics />}<View style={styles.row}><Text style={styles.sectionTitle}>최근 기록</Text><Text onPress={() => router.push("/history")} accessibilityRole="link" style={styles.link}>전체 보기</Text></View>{history.length === 0 ? <Text style={styles.empty}>아직 기록이 없습니다.</Text> : history.slice(0, 5).map((item) => <View key={item.id} style={styles.history}><Text style={styles.historyTitle}>{item.selectedClass}</Text><Text style={styles.body}>{Math.round(item.confidence * 100)}% · {new Date(item.createdAt).toLocaleDateString("ko-KR")}</Text></View>)}</Screen>;
}
const styles = StyleSheet.create({ hero: { paddingVertical: 20, gap: 10 }, eyebrow: { color: theme.color.primary, fontWeight: "900", letterSpacing: 1 }, title: { fontSize: 38, lineHeight: 45, letterSpacing: -1.5, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, fontSize: 15, lineHeight: 23 }, tip: { backgroundColor: theme.color.accent, borderRadius: 16, padding: 18, marginTop: 8 }, tipTitle: { fontWeight: "900", color: theme.color.primaryDark, marginBottom: 5 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 }, sectionTitle: { fontSize: 20, fontWeight: "900", color: theme.color.text }, link: { color: theme.color.primary, fontWeight: "800", padding: 8 }, empty: { color: theme.color.muted, padding: 18, textAlign: "center" }, history: { backgroundColor: theme.color.surface, borderRadius: 12, padding: 15 }, historyTitle: { color: theme.color.text, fontWeight: "800" } });
