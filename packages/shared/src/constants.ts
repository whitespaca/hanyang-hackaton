export const GARBAGE_CLASSES = [
  "metal",
  "glass",
  "biological",
  "paper",
  "battery",
  "trash",
  "cardboard",
  "shoes",
  "clothes",
  "plastic",
] as const;

export type GarbageClass = (typeof GARBAGE_CLASSES)[number];

export const GARBAGE_LABELS: Record<GarbageClass, string> = {
  metal: "금속",
  glass: "유리",
  biological: "음식물·생물성",
  paper: "종이",
  battery: "배터리",
  trash: "일반쓰레기",
  cardboard: "골판지",
  shoes: "신발",
  clothes: "의류",
  plastic: "플라스틱",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
