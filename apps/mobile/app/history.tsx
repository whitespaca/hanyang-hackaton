import { GARBAGE_LABELS } from "@bunrishot/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui";
import { loadHistory, type HistoryItem } from "@/features/history/history";
import { theme } from "@/lib/theme";

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]); useFocusEffect(useCallback(() => { loadHistory().then(setItems); }, []));
  return <Screen><Text style={styles.title}>최근 기록</Text><Text style={styles.body}>최대 20개의 선택 결과만 이 기기에 저장합니다. 사진 원본은 저장하지 않습니다.</Text>{items.length === 0 ? <Text style={styles.empty}>아직 기록이 없습니다.</Text> : items.map((item) => <View key={item.id} style={styles.card}><Text style={styles.itemTitle}>{GARBAGE_LABELS[item.selectedClass]}</Text><Text style={styles.body}>AI: {GARBAGE_LABELS[item.predictedClass]} · {Math.round(item.confidence * 100)}%</Text><Text style={styles.body}>{new Date(item.createdAt).toLocaleString("ko-KR")}</Text></View>)}</Screen>;
}
const styles = StyleSheet.create({ title: { fontSize: 30, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, lineHeight: 22 }, empty: { color: theme.color.muted, textAlign: "center", padding: 40 }, card: { backgroundColor: theme.color.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border, padding: 16, gap: 5 }, itemTitle: { fontSize: 18, fontWeight: "900", color: theme.color.text } });
