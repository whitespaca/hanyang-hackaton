"use client";

import type { CollectionSpot } from "@bunrishot/shared";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao?: {
      maps: {
        load(callback: () => void): void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => { setCenter(position: unknown): void };
        LatLng: new (latitude: number, longitude: number) => unknown;
        Marker: new (options: { map: unknown; position: unknown; title: string }) => unknown;
        event: { addListener(target: unknown, eventName: string, listener: () => void): void };
      };
    };
  }
}

export function KakaoMap({ spots, selectedSpotId, center, onSelectSpot }: { spots: CollectionSpot[]; selectedSpotId?: string; center?: { latitude: number; longitude: number }; onSelectSpot?: (spotId: string) => void }) {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ setCenter(position: unknown): void } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!key || spots.length === 0 || !containerRef.current) return;
    const render = () => window.kakao?.maps.load(() => {
      if (!window.kakao || !containerRef.current) return;
      const first = spots[0];
      if (!first) return;
      const initialCenter = new window.kakao.maps.LatLng(center?.latitude ?? first.latitude, center?.longitude ?? first.longitude);
      const map = new window.kakao.maps.Map(containerRef.current, { center: initialCenter, level: 6 });
      mapRef.current = map;
      if (center) new window.kakao.maps.Marker({ map, position: initialCenter, title: "현재 위치" });
      for (const spot of spots) {
        const marker = new window.kakao.maps.Marker({ map, position: new window.kakao.maps.LatLng(spot.latitude, spot.longitude), title: spot.nameKo });
        if (onSelectSpot) window.kakao.maps.event.addListener(marker, "click", () => onSelectSpot(spot.id));
      }
    });
    const existing = document.querySelector<HTMLScriptElement>('script[data-bunrishot-kakao-map="true"]');
    if (existing) { if (window.kakao) render(); else existing.addEventListener("load", render, { once: true }); return; }
    const script = document.createElement("script");
    script.dataset.bunrishotKakaoMap = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.addEventListener("load", render, { once: true });
    script.addEventListener("error", () => setFailed(true), { once: true });
    document.head.append(script);
  }, [center, key, onSelectSpot, spots]);

  useEffect(() => {
    const selected = spots.find((spot) => spot.id === selectedSpotId);
    if (selected && mapRef.current && window.kakao) mapRef.current.setCenter(new window.kakao.maps.LatLng(selected.latitude, selected.longitude));
  }, [selectedSpotId, spots]);

  if (!key) return <p className="muted" role="status">카카오 지도 키가 없어 목록 전용 모드로 표시합니다.</p>;
  if (failed) return <p className="muted" role="status">지도를 불러오지 못했습니다. 장소 목록과 외부 지도 링크는 계속 사용할 수 있습니다.</p>;
  if (spots.length === 0) return null;
  return <div ref={containerRef} aria-label="수거 장소 지도" style={{ width: "100%", minHeight: 420, borderRadius: 18, background: "#e9efeb" }} />;
}
