import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionSpotFinder } from "@/components/spots/CollectionSpotFinder";
import { CollectionSpotCta } from "@/components/spots/CollectionSpotCta";
import { KakaoMap } from "@/components/spots/KakaoMap";

const mocks = vi.hoisted(() => ({ listSpots: vi.fn(), findNearbySpots: vi.fn(), getCurrentPosition: vi.fn() }));
const spot = { id: "janghak-bank-pharmacy-recycling", nameKo: "은행약국 인근 재활용 배출장소", spotTypes: ["recycling-station" as const], address: "강원특별자치도 춘천시 동면 장학리 1014", latitude: 37.89273948, longitude: 127.755362, organization: "강원특별자치도 춘천시", phone: null, operatingHours: "18:00~23:00", note: "은행약국 인근", source: { name: "공공데이터포털", url: "https://www.data.go.kr/", checkedAt: "2022-12-15" } };
const response = { version: "1", locale: "ko-KR", regionLabel: "강원특별자치도 춘천시 동면 시연 데이터", dataMode: "fixture" as const, disclaimer: "방문 전 확인", lastUpdated: "2025-11-17", spots: [spot] };

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", () => ({ apiClient: { listSpots: (...args: unknown[]) => mocks.listSpots(...args), findNearbySpots: (...args: unknown[]) => mocks.findNearbySpots(...args) } }));

describe("collection spot finder", () => {
  beforeEach(() => {
    mocks.listSpots.mockReset().mockResolvedValue(response);
    mocks.findNearbySpots.mockReset().mockResolvedValue({ ...response, spots: [{ ...spot, distanceKm: 0.32 }] });
    mocks.getCurrentPosition.mockReset();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: mocks.getCurrentPosition } });
  });
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); document.querySelector('script[data-bunrishot-kakao-map="true"]')?.remove(); });

  it("shows fixture list without prompting for location and falls back without a map key", async () => {
    render(<CollectionSpotFinder />);
    await screen.findByText("은행약국 인근 재활용 배출장소");
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByText(/목록 전용 모드/)).toBeInTheDocument();
    expect(screen.getByText(/시연용 장소 데이터/)).toBeInTheDocument();
  });

  it("keeps the list after denied geolocation", async () => {
    mocks.getCurrentPosition.mockImplementation((_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" }));
    render(<CollectionSpotFinder />);
    await screen.findByText("은행약국 인근 재활용 배출장소");
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 사용" }));
    await screen.findByText(/위치 권한 없이도/);
    expect(screen.getByText("은행약국 인근 재활용 배출장소")).toBeInTheDocument();
  });

  it("loads distance-sorted nearby data after permission success", async () => {
    mocks.getCurrentPosition.mockImplementation((success: PositionCallback) => success({ coords: { latitude: 37.5, longitude: 127 } } as GeolocationPosition));
    render(<CollectionSpotFinder />);
    await screen.findByText("은행약국 인근 재활용 배출장소");
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 사용" }));
    await waitFor(() => expect(mocks.findNearbySpots).toHaveBeenCalled());
    expect(await screen.findByText("320m")).toBeInTheDocument();
  });

  it("renders an item CTA only for findable spot types", () => {
    const base = { id: "power-bank", nameKo: "보조배터리", aliases: [], keywords: ["배터리"], classificationCategory: "battery" as const, group: "battery", groupLabel: "배터리", recyclability: "special" as const, summary: "안내", steps: ["1", "2"], warnings: ["주의"], reasons: [{ title: "이유", explanation: "설명" }], regionalNote: "지역 확인", source: { name: "공식", url: null, checkedAt: "2026-07-19" }, popular: true };
    const { rerender } = render(<CollectionSpotCta item={{ ...base, spotTypes: ["battery-box"] }} />);
    expect(screen.getByRole("link", { name: "가까운 배출 장소 찾기" })).toBeInTheDocument();
    rerender(<CollectionSpotCta item={{ ...base, spotTypes: ["general-waste"] }} />);
    expect(screen.queryByRole("link", { name: "가까운 배출 장소 찾기" })).not.toBeInTheDocument();
  });

  it("falls back to the accessible list when the Kakao SDK fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "javascript-key");
    render(<KakaoMap spots={[spot]} />);
    const script = document.querySelector('script[data-bunrishot-kakao-map="true"]');
    expect(script).not.toBeNull();
    fireEvent.error(script!);
    expect(await screen.findByText(/지도를 불러오지 못했습니다/)).toBeInTheDocument();
  });
});
