import type { DisposalItem } from "@bunrishot/shared";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ErrorState, GuideChecklist, Screen } from "@/components/ui";
import { apiClient } from "@/lib/api";

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const [item, setItem] = useState<DisposalItem | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    apiClient.getItem(itemId).then((result) => {
      if (!active) return;
      setItem(result);
    }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "품목 가이드를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [itemId, attempt]);
  return <Screen>{error ? <ErrorState message={error} onRetry={() => { setError(""); setAttempt((value) => value + 1); }} /> : item ? <GuideChecklist guide={item} /> : <Text accessibilityLiveRegion="polite">가이드를 불러오는 중입니다…</Text>}</Screen>;
}
