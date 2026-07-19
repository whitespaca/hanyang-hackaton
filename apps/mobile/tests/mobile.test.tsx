import { render, screen } from "@testing-library/react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorState, GuideChecklist, PermissionDenied, PredictionList } from "@/components/ui";
import {
  HISTORY_LIMIT,
  limitHistory,
  type HistoryItem,
} from "@/features/history/history";
import { inspectApiBaseUrl } from "@/lib/apiConfig";
import {
  calculateResizeDimensions,
  validateUploadFile,
} from "@/lib/imageProcessing";
import { getPermissionUiState } from "@/lib/permissions";
import { addRecentSearch, clearRecentSearches, deleteRecentSearch, loadRecentSearches, RECENT_SEARCH_STORAGE_KEY } from "@/features/search/recentSearches";

describe("mobile P0", () => {
  it("keeps only the latest 20 history items", () => {
    const items: HistoryItem[] = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      predictedClass: "plastic",
      selectedClass: "plastic",
      confidence: 0.7,
      createdAt: new Date(2026, 0, index + 1).toISOString(),
    }));
    const limited = limitHistory(items);
    expect(limited).toHaveLength(HISTORY_LIMIT);
    expect(limited[0]?.id).toBe("24");
  });

  it("renders predictions and low confidence", () => {
    render(
      <PredictionList
        threshold={0.65}
        predictions={[
          { className: "plastic", labelKo: "플라스틱", confidence: 0.57 },
          { className: "glass", labelKo: "유리", confidence: 0.3 },
          { className: "metal", labelKo: "금속", confidence: 0.13 },
        ]}
      />,
    );
    expect(screen.getByText("57% · 확인 필요")).toBeTruthy();
    expect(screen.getByLabelText("AI 예측 Top 3")).toBeTruthy();
  });

  it("shows denied permission fallback", () => {
    render(
      <PermissionDenied
        canAskAgain={false}
        onRequest={jest.fn()}
        onGallery={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "설정 열기" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "갤러리에서 선택" }),
    ).toBeTruthy();
  });

  it("shows network guidance through an error state", () => {
    render(<ErrorState message="네트워크와 API 주소를 확인해주세요." />);
    expect(screen.getByText(/네트워크/)).toBeTruthy();
  });

  it("keeps image aspect ratio while limiting the long edge", () => {
    expect(calculateResizeDimensions(4000, 3000)).toEqual({
      width: 1280,
      height: 960,
    });
    expect(calculateResizeDimensions(640, 480)).toEqual({
      width: 640,
      height: 480,
    });
    expect(() => calculateResizeDimensions(0, 480)).toThrow(
      "이미지 크기는 0보다 커야 합니다.",
    );
  });

  it("accepts an existing non-empty compressed image", () => {
    expect(() =>
      validateUploadFile({ exists: true, size: 1024 }),
    ).not.toThrow();
  });

  it("rejects a missing or empty compressed image", () => {
    expect(() => validateUploadFile({ exists: false, size: 0 })).toThrow(
      "압축한 이미지 파일이 존재하지 않습니다.",
    );
    expect(() => validateUploadFile({ exists: true, size: 0 })).toThrow(
      "압축한 이미지 파일이 비어 있습니다.",
    );
  });

  it("warns about device loopback but allows the Android emulator host", () => {
    expect(inspectApiBaseUrl("http://localhost:8000").warning).toMatch(
      /LAN IP/,
    );
    expect(inspectApiBaseUrl("http://10.0.2.2:8000").warning).toBeUndefined();
    expect(inspectApiBaseUrl("not-a-url").isValid).toBe(false);
  });

  it("maps denied and restricted permission branches", () => {
    expect(getPermissionUiState(null)).toBe("not-determined");
    expect(getPermissionUiState({ status: "granted", granted: true })).toBe(
      "granted",
    );
    expect(getPermissionUiState({ status: "denied", canAskAgain: true })).toBe(
      "denied",
    );
    expect(getPermissionUiState({ status: "denied", canAskAgain: false })).toBe(
      "restricted",
    );
    expect(getPermissionUiState({ status: "denied", available: false })).toBe(
      "unavailable",
    );
  });

  it("deduplicates, deletes, and clears recent item searches", async () => {
    await AsyncStorage.clear();
    await addRecentSearch({ itemId: "power-bank", query: "보조", nameKo: "보조배터리", searchedAt: "2026-07-19T00:00:00.000Z" });
    await addRecentSearch({ itemId: "power-bank", query: "휴대용 배터리", nameKo: "보조배터리", searchedAt: "2026-07-19T01:00:00.000Z" });
    expect(await loadRecentSearches()).toHaveLength(1);
    expect(JSON.parse((await AsyncStorage.getItem(RECENT_SEARCH_STORAGE_KEY)) ?? "[]")[0].query).toBe("휴대용 배터리");
    expect(await deleteRecentSearch("power-bank")).toEqual([]);
    await addRecentSearch({ itemId: "power-bank", query: "보조", nameKo: "보조배터리", searchedAt: "2026-07-19T00:00:00.000Z" });
    expect(await clearRecentSearches()).toEqual([]);
  });

  it("renders disposal reasons and source from the shared detail contract", () => {
    render(<GuideChecklist guide={{ id: "power-bank", nameKo: "보조배터리", aliases: ["휴대용 배터리"], keywords: ["충전"], classificationCategory: "battery", group: "battery", groupLabel: "배터리", recyclability: "special", summary: "전용 수거처를 확인합니다.", steps: ["전원을 끕니다.", "단자를 절연합니다."], warnings: ["손상 제품은 충전하지 마세요."], reasons: [{ title: "단자를 막는 이유", explanation: "단락을 예방합니다." }], spotTypes: ["battery-box"], regionalNote: "지역 기준을 확인하세요.", source: { name: "공식 안내", url: null, checkedAt: "2026-07-19" }, popular: true }} />);
    expect(screen.getByText("왜 이렇게 버려야 하나요?")).toBeTruthy();
    expect(screen.getByText("단락을 예방합니다.")).toBeTruthy();
    expect(screen.getByText("공식 안내")).toBeTruthy();
  });
});
