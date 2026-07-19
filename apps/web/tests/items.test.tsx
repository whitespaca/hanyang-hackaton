import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItemSearchBox } from "@/components/items/ItemSearchBox";
import { clearRecentSearches, deleteRecentSearch, loadRecentSearches, saveRecentSearch } from "@/lib/recentSearches";

const mocks = vi.hoisted(() => ({ push: vi.fn(), searchItems: vi.fn() }));
const summary = { id: "power-bank", nameKo: "보조배터리", aliases: ["휴대용 배터리"], classificationCategory: "battery" as const, group: "battery", groupLabel: "배터리", recyclability: "special" as const, summary: "전용 수거처를 확인합니다.", popular: true };

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/api", () => ({ apiClient: { listItems: vi.fn(async () => ({ version: "1", locale: "ko-KR", items: [] })), searchItems: (...args: unknown[]) => mocks.searchItems(...args) } }));

describe("item search", () => {
  beforeEach(() => { localStorage.clear(); mocks.push.mockClear(); mocks.searchItems.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("debounces autocomplete and supports keyboard selection", async () => {
    mocks.searchItems.mockResolvedValue({ query: "보조", results: [summary], suggestions: [] });
    render(<ItemSearchBox />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "보조" } });
    expect(mocks.searchItems).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("보조배터리")).toBeInTheDocument(), { timeout: 1_000 });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.submit(screen.getByRole("combobox").closest("form")!);
    expect(mocks.push).toHaveBeenCalledWith("/items/power-bank");
  });

  it("renders fuzzy suggestions and no-result guidance", async () => {
    mocks.searchItems.mockResolvedValueOnce({ query: "보조베터리", results: [], suggestions: [summary] });
    render(<ItemSearchBox />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "보조베터리" } });
    await waitFor(() => expect(screen.getByText("혹시 이것을 찾으셨나요?")).toBeInTheDocument(), { timeout: 1_000 });
    mocks.searchItems.mockResolvedValueOnce({ query: "없는품목", results: [], suggestions: [] });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "없는품목" } });
    await waitFor(() => expect(screen.getByText(/검색 결과가 없습니다/)).toBeInTheDocument(), { timeout: 1_000 });
  });

  it("deduplicates, deletes, and clears local recent searches", () => {
    const first = { itemId: "power-bank", query: "보조", nameKo: "보조배터리", searchedAt: "2026-07-19T00:00:00.000Z" };
    const latest = { ...first, query: "휴대용 배터리", searchedAt: "2026-07-19T01:00:00.000Z" };
    saveRecentSearch(first); saveRecentSearch(latest);
    expect(loadRecentSearches()).toEqual([latest]);
    expect(deleteRecentSearch("power-bank")).toEqual([]);
    saveRecentSearch(first);
    expect(clearRecentSearches()).toEqual([]);
  });
});
