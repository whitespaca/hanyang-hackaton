import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SearchScreen from "@/app/search";

const mockPush = jest.fn();
const mockSearchItems = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({}),
}));
jest.mock("@/lib/api", () => ({
  apiClient: { searchItems: (...args: unknown[]) => mockSearchItems(...args) },
}));
jest.mock("@/features/search/recentSearches", () => ({
  loadRecentSearches: jest.fn(async () => []),
  addRecentSearch: jest.fn(async (item: unknown) => [item]),
  deleteRecentSearch: jest.fn(async () => []),
  clearRecentSearches: jest.fn(async () => []),
}));

const powerBank = {
  id: "power-bank",
  nameKo: "보조배터리",
  aliases: ["휴대용 배터리"],
  classificationCategory: "battery",
  group: "battery",
  groupLabel: "배터리",
  recyclability: "special",
  summary: "전용 수거처를 확인합니다.",
  popular: true,
};

describe("mobile item search", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
    mockSearchItems.mockReset();
  });

  afterEach(() => jest.useRealTimers());

  it("debounces results and navigates to the selected item", async () => {
    mockSearchItems.mockResolvedValue({ query: "보조", results: [powerBank], suggestions: [] });
    render(<SearchScreen />);
    fireEvent.changeText(screen.getByLabelText("품목 이름"), "보조");
    expect(mockSearchItems).not.toHaveBeenCalled();
    await act(async () => { await jest.advanceTimersByTimeAsync(200); });
    await waitFor(() => expect(screen.getByText("보조배터리")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "보조배터리 상세 보기" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: "/item/[itemId]", params: { itemId: "power-bank" } }));
  });

  it("renders fuzzy suggestions and an empty result state", async () => {
    mockSearchItems.mockResolvedValueOnce({ query: "보조베터리", results: [], suggestions: [powerBank] });
    render(<SearchScreen />);
    fireEvent.changeText(screen.getByLabelText("품목 이름"), "보조베터리");
    await act(async () => { await jest.advanceTimersByTimeAsync(200); });
    await waitFor(() => expect(screen.getByText("혹시 이것을 찾으셨나요?")).toBeTruthy());

    mockSearchItems.mockResolvedValueOnce({ query: "없는품목", results: [], suggestions: [] });
    fireEvent.changeText(screen.getByLabelText("품목 이름"), "없는품목");
    await act(async () => { await jest.advanceTimersByTimeAsync(200); });
    await waitFor(() => expect(screen.getByText(/검색 결과가 없습니다/)).toBeTruthy());
  });

  it("shows an API error without crashing", async () => {
    mockSearchItems.mockRejectedValue(new Error("서버에 연결할 수 없습니다."));
    render(<SearchScreen />);
    fireEvent.changeText(screen.getByLabelText("품목 이름"), "보조");
    await act(async () => { await jest.advanceTimersByTimeAsync(200); });
    await waitFor(() => expect(screen.getByText("서버에 연결할 수 없습니다.")).toBeTruthy());
  });
});
