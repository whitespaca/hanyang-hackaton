import type { RecentSearchItem } from "@bunrishot/shared";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton, ErrorState, Screen } from "@/components/ui";
import { NetworkDiagnostics } from "@/components/NetworkDiagnostics";
import { useFlow } from "@/features/classification/FlowContext";
import { loadHistory, type HistoryItem } from "@/features/history/history";
import { loadRecentSearches } from "@/features/search/recentSearches";
import { theme } from "@/lib/theme";
import { getPermissionUiState } from "@/lib/permissions";

const POPULAR_ITEMS = ["보조배터리", "우유팩", "투명 페트병", "폐의약품"];

export default function HomeScreen() {
  const { dispatch } = useFlow();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    Promise.all([loadHistory(), loadRecentSearches()])
      .then(([nextHistory, nextRecent]) => { setHistory(nextHistory); setRecentSearches(nextRecent); })
      .catch(() => setError("최근 기록을 불러오지 못했습니다."));
  }, []));

  function openSearch(query = searchQuery) {
    router.push({ pathname: "/search", params: query.trim() ? { q: query.trim() } : {} });
  }

  async function pickImage() {
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const permissionState = getPermissionUiState(permission);
      if (permissionState !== "granted") {
        setError(permissionState === "restricted" ? "사진 권한이 제한되었습니다. 설정에서 허용하거나 카메라를 사용해주세요." : "사진 권한이 거절되었습니다. 다시 허용하거나 카메라를 사용해주세요.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) { setError("선택한 사진을 읽을 수 없습니다."); return; }
      dispatch({ type: "image", image: { uri: asset.uri, width: asset.width, height: asset.height, ...(asset.fileName ? { fileName: asset.fileName } : {}) } });
      router.push("/preview");
    } catch {
      setError("갤러리를 열 수 없습니다. 권한을 확인하고 다시 시도해주세요.");
    }
  }

  return <Screen>
    <View style={styles.searchCard}>
      <Text style={styles.searchTitle}>이거 어떻게 버리지?</Text>
      <TextInput accessibilityLabel="홈 품목 검색" value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => openSearch()} placeholder="물건 이름을 입력하세요" returnKeyType="search" style={styles.input} />
      <ActionButton label="품목 검색" disabled={!searchQuery.trim()} onPress={() => openSearch()} />
      <View style={styles.chips}>{POPULAR_ITEMS.map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => openSearch(item)} style={styles.chip}><Text style={styles.chipText}>{item}</Text></Pressable>)}</View>
      {recentSearches.length > 0 && <View><Text style={styles.tipTitle}>최근 검색</Text>{recentSearches.slice(0, 3).map((item) => <Pressable key={item.itemId} onPress={() => router.push({ pathname: "/item/[itemId]", params: { itemId: item.itemId } })}><Text style={styles.recentSearch}>{item.nameKo}</Text></Pressable>)}</View>}
    </View>
    <View style={styles.hero}><Text style={styles.eyebrow}>AI 분리배출 도우미</Text><Text style={styles.title}>사진 한 장으로{`\n`}배출 방법까지</Text><Text style={styles.body}>AI의 Top 3를 확인하고, 실제 품목은 직접 선택해 안전한 안내를 받으세요.</Text></View>
    {error && <ErrorState message={error} />}
    <ActionButton label="사진 촬영" onPress={() => router.push("/capture")} />
    <ActionButton label="갤러리에서 선택" variant="secondary" onPress={pickImage} />
    <View style={styles.tip}><Text style={styles.tipTitle}>촬영 팁</Text><Text style={styles.body}>밝은 곳에서 물건 하나만 화면 가운데 크게 담아주세요.</Text></View>
    {__DEV__ && <NetworkDiagnostics />}
    <View style={styles.row}><Text style={styles.sectionTitle}>최근 AI 기록</Text><Text onPress={() => router.push("/history")} accessibilityRole="link" style={styles.link}>전체 보기</Text></View>
    {history.length === 0 ? <Text style={styles.empty}>아직 기록이 없습니다.</Text> : history.slice(0, 5).map((item) => <View key={item.id} style={styles.history}><Text style={styles.historyTitle}>{item.selectedClass}</Text><Text style={styles.body}>{Math.round(item.confidence * 100)}% · {new Date(item.createdAt).toLocaleDateString("ko-KR")}</Text></View>)}
  </Screen>;
}

const styles = StyleSheet.create({
  searchCard: { backgroundColor: theme.color.surface, borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: theme.color.border },
  searchTitle: { fontSize: 25, fontWeight: "900", color: theme.color.text },
  input: { minHeight: 50, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md, paddingHorizontal: 14, color: theme.color.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { backgroundColor: theme.color.accent, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 }, chipText: { color: theme.color.primaryDark, fontWeight: "800" },
  recentSearch: { color: theme.color.primary, fontWeight: "800", paddingVertical: 8 },
  hero: { paddingVertical: 20, gap: 10 }, eyebrow: { color: theme.color.primary, fontWeight: "900", letterSpacing: 1 }, title: { fontSize: 38, lineHeight: 45, letterSpacing: -1.5, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, fontSize: 15, lineHeight: 23 },
  tip: { backgroundColor: theme.color.accent, borderRadius: 16, padding: 18, marginTop: 8 }, tipTitle: { fontWeight: "900", color: theme.color.primaryDark, marginBottom: 5 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 }, sectionTitle: { fontSize: 20, fontWeight: "900", color: theme.color.text }, link: { color: theme.color.primary, fontWeight: "800", padding: 8 }, empty: { color: theme.color.muted, padding: 18, textAlign: "center" }, history: { backgroundColor: theme.color.surface, borderRadius: 12, padding: 15 }, historyTitle: { color: theme.color.text, fontWeight: "800" },
});
