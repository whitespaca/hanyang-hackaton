import type { GarbageClass } from "@bunrishot/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClassPicker, ErrorState, Screen } from "@/components/ui";
import { useFlow } from "@/features/classification/FlowContext";
import { apiClient } from "@/lib/api";
import { theme } from "@/lib/theme";

export default function RefineScreen() {
  const { state, dispatch } = useFlow(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function chooseClass(value: GarbageClass) { setLoading(true); setError(""); try { dispatch({ type: "class", selectedClass: value }); dispatch({ type: "category", category: await apiClient.getCategory(value) }); } catch (caught) { setError(caught instanceof Error ? caught.message : "품목 목록을 불러오지 못했습니다."); } finally { setLoading(false); } }
  async function chooseSubcategory(value: string) { if (!state.selectedClass) return; setLoading(true); try { dispatch({ type: "guide", guide: await apiClient.getGuide(state.selectedClass, value) }); router.push("/guide"); } catch (caught) { setError(caught instanceof Error ? caught.message : "가이드를 불러오지 못했습니다."); } finally { setLoading(false); } }
  return <Screen><Text style={styles.title}>{state.category ? "어떤 품목에 가까운가요?" : "실제 쓰레기 종류를 선택해주세요"}</Text><Text style={styles.body}>AI 결과와 다르면 직접 바꿀 수 있습니다.</Text>{error && <ErrorState message={error} />}{loading && <Text accessibilityLiveRegion="polite">불러오는 중…</Text>}{state.category ? <View style={styles.list}>{state.category.subcategories.map((item) => <Pressable accessibilityRole="button" key={item.subcategory} onPress={() => void chooseSubcategory(item.subcategory)} style={styles.item}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.body}>{item.keywords.slice(0, 3).join(" · ")}</Text></Pressable>)}</View> : <ClassPicker onSelect={(value) => void chooseClass(value)} />}</Screen>;
}
const styles = StyleSheet.create({ title: { fontSize: 28, lineHeight: 36, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, lineHeight: 22 }, list: { gap: 10 }, item: { minHeight: 68, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface }, itemTitle: { color: theme.color.text, fontSize: 17, fontWeight: "800", marginBottom: 4 } });
