export type GeolocationFailure = "unsupported" | "denied" | "unavailable" | "timeout";

export function requestCurrentPosition(timeout = 10_000): Promise<GeolocationPosition> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("unsupported" satisfies GeolocationFailure));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      const code: GeolocationFailure = error.code === error.PERMISSION_DENIED
        ? "denied"
        : error.code === error.TIMEOUT ? "timeout" : "unavailable";
      reject(new Error(code));
    }, { enableHighAccuracy: false, maximumAge: 300_000, timeout });
  });
}

export const GEOLOCATION_MESSAGES: Record<GeolocationFailure, string> = {
  unsupported: "이 브라우저는 위치 기능을 지원하지 않습니다. 장소 목록과 외부 지도 검색을 이용해주세요.",
  denied: "위치 권한 없이도 장소 목록과 외부 지도 검색을 사용할 수 있습니다.",
  unavailable: "현재 위치를 확인할 수 없습니다. 잠시 후 다시 시도하거나 목록을 이용해주세요.",
  timeout: "위치 확인 시간이 초과되었습니다. 목록은 계속 사용할 수 있습니다.",
};
