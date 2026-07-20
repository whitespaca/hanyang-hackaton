import { buildKakaoMapDirectionsUrl, buildKakaoMapPlaceUrl, buildKakaoMapSearchUrl, COLLECTION_SPOT_TYPES, COLLECTION_SPOT_TYPE_METADATA, filterFindableSpotTypes, formatDistance, type CollectionSpot, type CollectionSpotType, type CollectionSpotWithDistance } from "@bunrishot/shared";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton, ErrorState, Screen } from "@/components/ui";
import { apiClient } from "@/lib/api";
import { theme } from "@/lib/theme";

const FINDABLE_TYPES = filterFindableSpotTypes([...COLLECTION_SPOT_TYPES]);
const isSpotType = (value: string): value is CollectionSpotType => (COLLECTION_SPOT_TYPES as readonly string[]).includes(value);
async function openUrl(url: string) { if (await Linking.canOpenURL(url)) await Linking.openURL(url); else throw new Error("외부 지도를 열 수 없습니다."); }

export default function CollectionSpotsScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialTypes = useMemo(() => (params.type ?? "").split(",").filter(isSpotType), [params.type]);
  const [selectedTypes, setSelectedTypes] = useState<CollectionSpotType[]>(initialTypes);
  const [spots, setSpots] = useState<(CollectionSpot | CollectionSpotWithDistance)[]>([]);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [metadata, setMetadata] = useState<{ region: string; mode: string; updated: string; disclaimer: string } | null>(null);
  const [loading, setLoading] = useState(true); const [locating, setLocating] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = position ? await apiClient.findNearbySpots({ ...position, spotTypes: selectedTypes.length ? selectedTypes : undefined, limit: 20, radiusKm: 10 }) : await apiClient.listSpots(selectedTypes);
      setSpots(response.spots); setMetadata({ region: response.regionLabel, mode: response.dataMode, updated: response.lastUpdated, disclaimer: response.disclaimer });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "장소 목록을 불러오지 못했습니다."); } finally { setLoading(false); }
  }, [position, selectedTypes]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function requestCurrentLocation() {
    setLocating(true); setMessage("");
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) { setMessage(permission.canAskAgain ? "위치 권한 없이도 장소 목록과 외부 지도 검색을 사용할 수 있습니다." : "위치 권한이 꺼져 있습니다. 위치 없이 목록을 보거나 기기 설정에서 권한을 변경할 수 있습니다."); return; }
      const recent = await Location.getLastKnownPositionAsync({ maxAge: 300_000, requiredAccuracy: 1000 });
      const current = recent ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude }); setMessage("현재 위치를 기준으로 10km 안의 장소를 거리순으로 표시합니다.");
    } catch { setMessage("현재 위치를 확인하지 못했습니다. 장소 목록과 외부 지도 검색은 계속 사용할 수 있습니다."); } finally { setLocating(false); }
  }

  const toggleType = (type: CollectionSpotType) => setSelectedTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  const externalQuery = selectedTypes[0] ? COLLECTION_SPOT_TYPE_METADATA[selectedTypes[0]].externalSearchQuery : "분리배출 수거함";
  const open = (url: string) => void openUrl(url).catch(() => setMessage("외부 지도를 열 수 없습니다."));

  return <Screen><Text style={styles.title}>가까운 배출 장소</Text><Text style={styles.body}>위치는 버튼을 누를 때만 요청하며 기기나 서버에 저장하지 않습니다.</Text><ActionButton label={locating ? "위치 확인 중…" : "현재 위치 사용"} disabled={locating} onPress={() => void requestCurrentLocation()} />{position && <ActionButton label="위치 없이 보기" variant="secondary" onPress={() => setPosition(null)} />}{message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
    <Text style={styles.heading}>장소 유형</Text><View style={styles.chips}>{FINDABLE_TYPES.map((type) => <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedTypes.includes(type) }} key={type} onPress={() => toggleType(type)} style={[styles.chip, selectedTypes.includes(type) && styles.chipSelected]}><Text style={[styles.chipText, selectedTypes.includes(type) && styles.chipTextSelected]}>{COLLECTION_SPOT_TYPE_METADATA[type].labelKo}</Text></Pressable>)}</View>
    {metadata && <View style={styles.metadata}><Text style={styles.metadataTitle}>{metadata.mode === "fixture" ? "시연용 장소 데이터" : "실시간 장소 데이터"}</Text><Text style={styles.body}>{metadata.region} · 마지막 확인일 {metadata.updated}</Text><Text style={styles.body}>{metadata.disclaimer}</Text></View>}{error && <ErrorState message={error} onRetry={() => void load()} />}{loading && <Text accessibilityLiveRegion="polite" style={styles.body}>장소를 불러오는 중입니다…</Text>}
    {!loading && !error && spots.length === 0 && <View style={styles.card}><Text style={styles.cardTitle}>조건에 맞는 fixture 장소가 없습니다.</Text><Text style={styles.body}>검증된 위치가 없는 유형은 외부 지도에서 검색해주세요.</Text><ActionButton label={`카카오맵에서 ${externalQuery} 검색`} variant="secondary" onPress={() => open(buildKakaoMapSearchUrl(externalQuery))} /></View>}
    {spots.map((spot) => <View key={spot.id} style={styles.card}><View style={styles.row}><Text style={styles.cardTitle}>{spot.nameKo}</Text>{"distanceKm" in spot && <Text style={styles.distance}>{formatDistance(spot.distanceKm)}</Text>}</View><Text style={styles.body}>{spot.address}</Text><Text style={styles.body}>{spot.spotTypes.map((type) => COLLECTION_SPOT_TYPE_METADATA[type].labelKo).join(" · ")}</Text>{spot.organization && <Text style={styles.body}>운영기관: {spot.organization}</Text>}{spot.operatingHours && <Text style={styles.body}>운영시간: {spot.operatingHours}</Text>}{spot.phone && <Text style={styles.body}>전화: {spot.phone}</Text>}<ActionButton label="주소 복사" variant="secondary" onPress={() => void Clipboard.setStringAsync(spot.address).then(() => setMessage("주소를 복사했습니다.")).catch(() => setMessage("주소를 복사하지 못했습니다."))} /><ActionButton label="카카오맵에서 보기" variant="secondary" onPress={() => open(buildKakaoMapPlaceUrl(spot.nameKo, spot.latitude, spot.longitude))} /><ActionButton label="길찾기" variant="secondary" onPress={() => open(buildKakaoMapDirectionsUrl(spot.nameKo, spot.latitude, spot.longitude))} /><Text style={styles.source}>출처: {spot.source.name} · 확인일 {spot.source.checkedAt}</Text></View>)}
  </Screen>;
}

const styles = StyleSheet.create({ title: { fontSize: 30, fontWeight: "900", color: theme.color.text }, body: { color: theme.color.muted, fontSize: 15, lineHeight: 22 }, notice: { color: theme.color.primaryDark, backgroundColor: theme.color.accent, padding: 14, borderRadius: 12 }, heading: { fontSize: 20, fontWeight: "900", color: theme.color.text, marginTop: 10 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 }, chipSelected: { backgroundColor: theme.color.primary }, chipText: { color: theme.color.primaryDark, fontWeight: "700" }, chipTextSelected: { color: "white" }, metadata: { backgroundColor: theme.color.accent, padding: 15, borderRadius: 14, gap: 4 }, metadataTitle: { fontWeight: "900", color: theme.color.primaryDark }, card: { backgroundColor: theme.color.surface, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: theme.color.border }, row: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, cardTitle: { flex: 1, fontSize: 19, fontWeight: "900", color: theme.color.text }, distance: { color: theme.color.primary, fontWeight: "900" }, source: { color: theme.color.muted, fontSize: 12, lineHeight: 18 } });
