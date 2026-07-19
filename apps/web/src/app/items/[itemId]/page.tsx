"use client";

import type { DisposalItem } from "@bunrishot/shared";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiErrorState, GuideChecklist } from "@/components/classification";
import { apiClient } from "@/lib/api";

export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
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
  return <main className="section container">{error ? <ApiErrorState message={error} onRetry={() => { setError(""); setAttempt((value) => value + 1); }} /> : item ? <div className="card" style={{ padding: 28 }}><GuideChecklist guide={item} /></div> : <p role="status">가이드를 불러오는 중입니다…</p>}</main>;
}
