"use client";

import {
  buildKakaoMapDirectionsUrl,
  buildKakaoMapPlaceUrl,
  buildKakaoMapSearchUrl,
  COLLECTION_SPOT_TYPES,
  COLLECTION_SPOT_TYPE_METADATA,
  filterFindableSpotTypes,
  formatDistance,
  type CollectionSpot,
  type CollectionSpotType,
  type CollectionSpotWithDistance,
} from "@bunrishot/shared";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { GEOLOCATION_MESSAGES, requestCurrentPosition, type GeolocationFailure } from "@/lib/geolocation";
import { KakaoMap } from "./KakaoMap";

const FINDABLE_TYPES = filterFindableSpotTypes([...COLLECTION_SPOT_TYPES]);

function isSpotType(value: string): value is CollectionSpotType {
  return (COLLECTION_SPOT_TYPES as readonly string[]).includes(value);
}

export function CollectionSpotFinder() {
  const searchParams = useSearchParams();
  const initialTypes = useMemo(() => searchParams.getAll("type").filter(isSpotType), [searchParams]);
  const [selectedTypes, setSelectedTypes] = useState<CollectionSpotType[]>(initialTypes);
  const [spots, setSpots] = useState<Array<CollectionSpot | CollectionSpotWithDistance>>([]);
  const [metadata, setMetadata] = useState<{ region: string; mode: string; updated: string; disclaimer: string } | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [selectedSpotId, setSelectedSpotId] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = position
        ? await apiClient.findNearbySpots({ ...position, spotTypes: selectedTypes.length ? selectedTypes : undefined, limit: 20, radiusKm: 10 })
        : await apiClient.listSpots(selectedTypes);
      setSpots(response.spots);
      setMetadata({ region: response.regionLabel, mode: response.dataMode, updated: response.lastUpdated, disclaimer: response.disclaimer });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "장소 목록을 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }, [position, selectedTypes]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const requestLocation = async () => {
    setLocating(true); setLocationMessage("");
    try {
      const current = await requestCurrentPosition();
      setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      setLocationMessage("현재 위치를 기준으로 10km 안의 장소를 거리순으로 표시합니다.");
    } catch (caught) {
      const key = caught instanceof Error ? caught.message as GeolocationFailure : "unavailable";
      setLocationMessage(GEOLOCATION_MESSAGES[key] ?? GEOLOCATION_MESSAGES.unavailable);
    } finally { setLocating(false); }
  };

  const toggleType = (type: CollectionSpotType) => setSelectedTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  const copyAddress = async (address: string) => { try { await navigator.clipboard?.writeText(address); setLocationMessage("주소를 복사했습니다."); } catch { setLocationMessage("주소를 복사하지 못했습니다. 주소를 직접 선택해 복사해주세요."); } };
  const externalQuery = selectedTypes[0] ? COLLECTION_SPOT_TYPE_METADATA[selectedTypes[0]].externalSearchQuery : "분리배출 수거함";
  const selectSpot = useCallback((spotId: string) => {
    setSelectedSpotId(spotId);
    window.setTimeout(() => document.getElementById(`spot-${spotId}`)?.focus(), 0);
  }, []);

  return <div style={{ display: "grid", gap: 24 }}>
    <div className="card" style={{ padding: 24 }}>
      <button className="button button-primary" disabled={locating} onClick={() => void requestLocation()}>{locating ? "위치 확인 중…" : "현재 위치 사용"}</button>
      {position && <button className="button button-secondary" style={{ marginLeft: 10 }} onClick={() => setPosition(null)}>위치 없이 보기</button>}
      {locationMessage && <p role="status">{locationMessage}</p>}
      <h2 style={{ fontSize: 20, marginTop: 24 }}>장소 유형</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {FINDABLE_TYPES.map((type) => <button aria-pressed={selectedTypes.includes(type)} className={selectedTypes.includes(type) ? "button button-primary" : "button button-secondary"} key={type} onClick={() => toggleType(type)} style={{ minHeight: 40, padding: "8px 12px" }}>{COLLECTION_SPOT_TYPE_METADATA[type].labelKo}</button>)}
      </div>
    </div>
    {metadata && <div role="status"><strong>{metadata.mode === "fixture" ? "시연용 장소 데이터" : "실시간 장소 데이터"}</strong> · {metadata.region} · 마지막 확인일 {metadata.updated}<p className="muted">{metadata.disclaimer}</p></div>}
    {error && <div role="alert" className="card" style={{ padding: 20 }}><strong>장소를 불러오지 못했습니다.</strong><p>{error}</p><button className="button button-secondary" onClick={() => void load()}>다시 시도</button></div>}
    {loading && <p role="status" aria-live="polite">장소를 불러오는 중입니다…</p>}
    {!loading && !error && spots.length === 0 && <div className="card" style={{ padding: 24 }}><strong>조건에 맞는 fixture 장소가 없습니다.</strong><p className="muted">검증된 위치 데이터가 없는 유형은 외부 지도 검색으로 확인해주세요.</p><a className="button button-secondary" href={buildKakaoMapSearchUrl(externalQuery)} target="_blank" rel="noreferrer">카카오맵에서 {externalQuery} 검색</a></div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 14 }}>
        {spots.map((spot) => <article className="card" id={`spot-${spot.id}`} key={spot.id} tabIndex={-1} onClick={() => setSelectedSpotId(spot.id)} style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><h2 style={{ fontSize: 20, margin: 0 }}>{spot.nameKo}</h2>{"distanceKm" in spot && <strong>{formatDistance(spot.distanceKm)}</strong>}</div>
          <p>{spot.address}</p><p className="muted">{spot.spotTypes.map((type) => COLLECTION_SPOT_TYPE_METADATA[type].labelKo).join(" · ")}</p>
          {spot.organization && <p className="muted">운영기관: {spot.organization}</p>}{spot.operatingHours && <p className="muted">운영시간: {spot.operatingHours}</p>}{spot.phone && <p className="muted">전화: {spot.phone}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button className="button button-secondary" onClick={() => void copyAddress(spot.address)}>주소 복사</button><a className="button button-secondary" href={buildKakaoMapPlaceUrl(spot.nameKo, spot.latitude, spot.longitude)} target="_blank" rel="noreferrer">지도에서 보기</a><a className="button button-secondary" href={buildKakaoMapDirectionsUrl(spot.nameKo, spot.latitude, spot.longitude)} target="_blank" rel="noreferrer">길찾기</a></div>
          <small className="muted">출처: {spot.source.name} · 확인일 {spot.source.checkedAt}</small>
        </article>)}
      </div>
      <div className="card" style={{ padding: 16, position: "sticky", top: 88 }}><KakaoMap spots={spots} onSelectSpot={selectSpot} {...(position ? { center: position } : {})} {...(selectedSpotId ? { selectedSpotId } : {})} /></div>
    </div>
  </div>;
}
