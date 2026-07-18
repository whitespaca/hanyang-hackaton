import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiErrorState, GuideChecklist, PredictionList, UploadDropzone } from "@/components/classification";

describe("classification components", () => {
  it("selects an upload and exposes accessible preview input", () => {
    const onSelect = vi.fn(); render(<UploadDropzone onSelect={onSelect} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(["image"], "fixture.png", { type: "image/png" });
    fireEvent.change(input!, { target: { files: [file] } });
    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it("renders top three and low confidence text", () => {
    render(<PredictionList threshold={0.65} predictions={[{ className: "plastic", labelKo: "플라스틱", confidence: .57 }, { className: "glass", labelKo: "유리", confidence: .3 }, { className: "metal", labelKo: "금속", confidence: .13 }]} />);
    expect(screen.getByText(/57% · 확인 필요/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("retries after an API error", () => {
    const retry = vi.fn(); render(<ApiErrorState message="서버가 응답하지 않습니다." onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" })); expect(retry).toHaveBeenCalledOnce();
  });

  it("checks guide steps", () => {
    render(<GuideChecklist guide={{ category: "cardboard", subcategory: "cardboard-box", title: "골판지 상자", recyclability: "yes", steps: ["테이프를 제거합니다.", "납작하게 접습니다."], warnings: [], keywords: ["상자"], sourceNote: "일반 원칙", disclaimer: "지역 기준을 확인하세요." }} />);
    const checkbox = screen.getByRole("checkbox", { name: "1단계 완료" }); fireEvent.click(checkbox); expect(checkbox).toBeChecked();
  });
});
