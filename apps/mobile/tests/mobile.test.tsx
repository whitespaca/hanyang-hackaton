import { render, screen } from "@testing-library/react-native";

import { ErrorState, PermissionDenied, PredictionList } from "@/components/ui";
import {
  HISTORY_LIMIT,
  limitHistory,
  type HistoryItem,
} from "@/features/history/history";
import { inspectApiBaseUrl } from "@/lib/apiConfig";
import {
  calculateResizeDimensions,
  readLocalImageBlob,
} from "@/lib/imageProcessing";
import { getPermissionUiState } from "@/lib/permissions";

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
  });

  it("reads a local file response even when its status is zero", async () => {
    const blob = { size: 256, type: "image/jpeg" } as Blob;
    const readBlob = jest.fn().mockResolvedValue(blob);
    const fetchImplementation = jest.fn().mockResolvedValue({
      ok: false,
      status: 0,
      blob: readBlob,
    } as unknown as Response);

    await expect(
      readLocalImageBlob(
        "file:///cache/upload.jpg",
        fetchImplementation as unknown as typeof fetch,
      ),
    ).resolves.toBe(blob);
    expect(readBlob).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty compressed image", async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      ok: false,
      status: 0,
      blob: jest.fn().mockResolvedValue({ size: 0, type: "image/jpeg" }),
    } as unknown as Response);

    await expect(
      readLocalImageBlob(
        "file:///cache/empty.jpg",
        fetchImplementation as unknown as typeof fetch,
      ),
    ).rejects.toThrow("압축한 이미지가 비어 있습니다.");
  });

  it("warns about device loopback but allows the Android emulator host", () => {
    expect(inspectApiBaseUrl("http://localhost:8000").warning).toMatch(/LAN IP/);
    expect(inspectApiBaseUrl("http://10.0.2.2:8000").warning).toBeUndefined();
    expect(inspectApiBaseUrl("not-a-url").isValid).toBe(false);
  });

  it("maps denied and restricted permission branches", () => {
    expect(getPermissionUiState(null)).toBe("not-determined");
    expect(getPermissionUiState({ status: "granted", granted: true })).toBe(
      "granted",
    );
    expect(
      getPermissionUiState({ status: "denied", canAskAgain: true }),
    ).toBe("denied");
    expect(
      getPermissionUiState({ status: "denied", canAskAgain: false }),
    ).toBe("restricted");
    expect(
      getPermissionUiState({ status: "denied", available: false }),
    ).toBe("unavailable");
  });
});
