import type { CollectionSpot } from "./schemas";
import { COLLECTION_SPOT_TYPE_METADATA, type CollectionSpotType } from "./spotTypes";

const EARTH_RADIUS_KM = 6371.0088;

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function haversineDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  if (![isValidLatitude(latitude1), isValidLongitude(longitude1), isValidLatitude(latitude2), isValidLongitude(longitude2)].every(Boolean)) {
    throw new RangeError("유효한 위도와 경도가 필요합니다.");
  }
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = radians(latitude2 - latitude1);
  const deltaLongitude = radians(longitude2 - longitude1);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(deltaLongitude / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sortSpotsByDistance(
  spots: CollectionSpot[],
  latitude: number,
  longitude: number,
): Array<CollectionSpot & { distanceKm: number }> {
  return spots
    .map((spot, index) => ({ ...spot, distanceKm: haversineDistanceKm(latitude, longitude, spot.latitude, spot.longitude), index }))
    .sort((left, right) => left.distanceKm - right.distanceKm || left.index - right.index)
    .map(({ index: _index, ...spot }) => spot);
}

export function filterFindableSpotTypes(types: CollectionSpotType[]): CollectionSpotType[] {
  return types.filter((type) => COLLECTION_SPOT_TYPE_METADATA[type].findable);
}

export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new RangeError("거리는 0 이상의 유한한 값이어야 합니다.");
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`;
}

function encodedPlace(name: string, latitude: number, longitude: number): string {
  return `${encodeURIComponent(name)},${latitude},${longitude}`;
}

export const buildKakaoMapSearchUrl = (query: string) => `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
export const buildKakaoMapPlaceUrl = (name: string, latitude: number, longitude: number) => `https://map.kakao.com/link/map/${encodedPlace(name, latitude, longitude)}`;
export const buildKakaoMapDirectionsUrl = (name: string, latitude: number, longitude: number) => `https://map.kakao.com/link/to/${encodedPlace(name, latitude, longitude)}`;
