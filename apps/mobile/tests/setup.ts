jest.mock("@react-native-async-storage/async-storage", () =>
  // Jest mock package is CommonJS by design.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
