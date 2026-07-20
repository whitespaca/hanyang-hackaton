import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CollectionSpotsScreen from "@/app/spots";

const mocks = {
  listSpots: jest.fn(), findNearbySpots: jest.fn(), getForeground: jest.fn(), requestForeground: jest.fn(), getLastKnown: jest.fn(), getCurrent: jest.fn(), copy: jest.fn(),
};
const spot = { id: "janghak-bank-pharmacy-recycling", nameKo: "은행약국 인근 재활용 배출장소", spotTypes: ["recycling-station"], address: "강원특별자치도 춘천시 동면 장학리 1014", latitude: 37.89273948, longitude: 127.755362, organization: "강원특별자치도 춘천시", phone: null, operatingHours: "18:00~23:00", note: "은행약국 인근", source: { name: "공공데이터포털", url: "https://www.data.go.kr/", checkedAt: "2022-12-15" } };
const response = { version: "1", locale: "ko-KR", regionLabel: "강원특별자치도 춘천시 동면 시연 데이터", dataMode: "fixture", disclaimer: "방문 전 확인", lastUpdated: "2025-11-17", spots: [spot] };

jest.mock("@/lib/api", () => ({ apiClient: { listSpots: (...args: unknown[]) => mocks.listSpots(...args), findNearbySpots: (...args: unknown[]) => mocks.findNearbySpots(...args) } }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({}), router: { push: jest.fn() } }));
jest.mock("expo-location", () => ({ PermissionStatus: { GRANTED: "granted" }, Accuracy: { Balanced: 3 }, getForegroundPermissionsAsync: () => mocks.getForeground(), requestForegroundPermissionsAsync: () => mocks.requestForeground(), getLastKnownPositionAsync: (...args: unknown[]) => mocks.getLastKnown(...args), getCurrentPositionAsync: (...args: unknown[]) => mocks.getCurrent(...args) }));
jest.mock("expo-clipboard", () => ({ setStringAsync: (...args: unknown[]) => mocks.copy(...args) }));

describe("mobile collection spots", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.listSpots.mockResolvedValue(response);
    mocks.findNearbySpots.mockResolvedValue({ ...response, spots: [{ ...spot, distanceKm: 0.32 }] });
    mocks.getForeground.mockResolvedValue({ status: "granted", canAskAgain: true });
    mocks.getLastKnown.mockResolvedValue({ coords: { latitude: 37.5, longitude: 127 } });
    mocks.copy.mockResolvedValue(undefined);
  });

  it("renders the fixture list without requesting permission on mount", async () => {
    render(<CollectionSpotsScreen />);
    expect(await screen.findByText("은행약국 인근 재활용 배출장소")).toBeTruthy();
    expect(mocks.getForeground).not.toHaveBeenCalled();
    expect(mocks.requestForeground).not.toHaveBeenCalled();
  });

  it("uses foreground location, renders distance, and does not persist coordinates", async () => {
    const storage = jest.spyOn(AsyncStorage, "setItem");
    render(<CollectionSpotsScreen />);
    await screen.findByText("은행약국 인근 재활용 배출장소");
    fireEvent.press(screen.getByLabelText("현재 위치 사용"));
    await waitFor(() => expect(mocks.findNearbySpots).toHaveBeenCalledWith(expect.objectContaining({ latitude: 37.5, longitude: 127 })));
    expect(await screen.findByText("320m")).toBeTruthy();
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it("keeps the list when location permission is denied", async () => {
    mocks.getForeground.mockResolvedValue({ status: "denied", canAskAgain: false });
    mocks.requestForeground.mockResolvedValue({ status: "denied", canAskAgain: false });
    render(<CollectionSpotsScreen />);
    await screen.findByText("은행약국 인근 재활용 배출장소");
    fireEvent.press(screen.getByLabelText("현재 위치 사용"));
    expect(await screen.findByText(/위치 권한이 꺼져 있습니다/)).toBeTruthy();
    expect(screen.getByText("은행약국 인근 재활용 배출장소")).toBeTruthy();
  });

  it("copies the address", async () => {
    render(<CollectionSpotsScreen />);
    await screen.findByText("은행약국 인근 재활용 배출장소");
    fireEvent.press(screen.getByLabelText("주소 복사"));
    await waitFor(() => expect(mocks.copy).toHaveBeenCalledWith(spot.address));
  });
});
