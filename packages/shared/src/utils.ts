export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function isLowConfidence(value: number, threshold: number): boolean {
  return value < threshold;
}
