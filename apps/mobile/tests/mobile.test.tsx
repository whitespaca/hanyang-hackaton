import { render, screen } from "@testing-library/react-native";
import { ErrorState, PermissionDenied, PredictionList } from "@/components/ui";
import { HISTORY_LIMIT, limitHistory, type HistoryItem } from "@/features/history/history";

describe("mobile P0", () => {
  it("keeps only the latest 20 history items", () => {
    const items: HistoryItem[] = Array.from({ length: 25 }, (_, index) => ({ id: String(index), predictedClass: "plastic", selectedClass: "plastic", confidence: .7, createdAt: new Date(2026, 0, index + 1).toISOString() }));
    const limited = limitHistory(items); expect(limited).toHaveLength(HISTORY_LIMIT); expect(limited[0]?.id).toBe("24");
  });
  it("renders predictions and low confidence", () => {
    render(<PredictionList threshold={.65} predictions={[{ className: "plastic", labelKo: "플라스틱", confidence: .57 }, { className: "glass", labelKo: "유리", confidence: .3 }, { className: "metal", labelKo: "금속", confidence: .13 }]} />);
    expect(screen.getByText("57% · 확인 필요")).toBeTruthy(); expect(screen.getByLabelText("AI 예측 Top 3")).toBeTruthy();
  });
  it("shows denied permission fallback", () => {
    render(<PermissionDenied canAskAgain={false} onRequest={jest.fn()} onGallery={jest.fn()} />);
    expect(screen.getByRole("button", { name: "설정 열기" })).toBeTruthy(); expect(screen.getByRole("button", { name: "갤러리에서 선택" })).toBeTruthy();
  });
  it("shows network guidance through an error state", () => {
    render(<ErrorState message="네트워크와 API 주소를 확인해주세요." />); expect(screen.getByText(/네트워크/)).toBeTruthy();
  });
});
