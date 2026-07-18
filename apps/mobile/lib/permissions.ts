export type PermissionUiState = "not-determined" | "granted" | "denied" | "restricted" | "unavailable";

interface PermissionLike {
  granted?: boolean;
  status?: string;
  canAskAgain?: boolean;
  available?: boolean;
}

export function getPermissionUiState(permission: PermissionLike | null): PermissionUiState {
  if (permission === null || permission.status === "undetermined") return "not-determined";
  if (permission.available === false) return "unavailable";
  if (permission.granted || permission.status === "granted") return "granted";
  if (permission.canAskAgain === false) return "restricted";
  return "denied";
}
