describe("mobile API transport", () => {
  it("injects expo fetch into the shared API client", () => {
    const mockApiClient = { health: jest.fn() };
    const mockCreateApiClient = jest.fn(() => mockApiClient);
    const mockExpoFetch = jest.fn();

    jest.isolateModules(() => {
      jest.doMock("@bunrishot/shared", () => ({
        createApiClient: mockCreateApiClient,
      }));
      jest.doMock("expo/fetch", () => ({
        fetch: mockExpoFetch,
      }));

      const { apiClient, apiConfiguration } =
        jest.requireActual<typeof import("@/lib/api")>("@/lib/api");

      expect(apiClient).toBe(mockApiClient);
      expect(mockCreateApiClient).toHaveBeenCalledWith(
        apiConfiguration.baseUrl,
        15_000,
        mockExpoFetch,
      );
    });
  });
});
