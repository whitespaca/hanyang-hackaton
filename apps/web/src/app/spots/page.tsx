import { Suspense } from "react";
import { CollectionSpotFinder } from "@/components/spots/CollectionSpotFinder";

export default function SpotsPage() {
  return <main className="section container"><p className="eyebrow">Collection spots</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", margin: "8px 0" }}>가까운 배출 장소</h1><p className="muted">위치는 버튼을 누를 때만 요청하며 저장하지 않습니다. 위치 권한 없이도 목록과 외부 지도 링크를 사용할 수 있습니다.</p><Suspense fallback={<p role="status">장소 찾기를 준비하는 중입니다…</p>}><CollectionSpotFinder /></Suspense></main>;
}
