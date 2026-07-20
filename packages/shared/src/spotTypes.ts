export const COLLECTION_SPOT_TYPES = [
  "battery-box",
  "bulky-waste",
  "clothes-bin",
  "cup-bin",
  "donation-center",
  "food-waste-bin",
  "general-waste",
  "glass-bin",
  "hazardous-waste",
  "health-center",
  "lamp-box",
  "manufacturer-takeback",
  "medicine-box",
  "non-combustible-waste",
  "paper-bin",
  "paper-cup-bin",
  "paper-pack-bin",
  "pet-bottle-bin",
  "plastic-bin",
  "recycling-station",
  "reuse-box",
  "small-electronics",
  "styrofoam-bin",
  "textile-collection",
  "vinyl-bin",
] as const;

export type CollectionSpotType = (typeof COLLECTION_SPOT_TYPES)[number];

export interface CollectionSpotTypeMetadata {
  labelKo: string;
  description: string;
  findable: boolean;
  externalSearchQuery: string;
}

export const COLLECTION_SPOT_TYPE_METADATA = {
  "battery-box": { labelKo: "폐건전지 수거함", description: "폐건전지와 허용되는 소형 전지를 수거하는 장소", findable: true, externalSearchQuery: "폐건전지 수거함" },
  "bulky-waste": { labelKo: "대형폐기물 신고 배출", description: "지자체 신고 후 지정 장소에 배출", findable: false, externalSearchQuery: "대형폐기물 신고" },
  "clothes-bin": { labelKo: "의류 수거함", description: "재사용 가능한 의류를 수거하는 장소", findable: true, externalSearchQuery: "의류 수거함" },
  "cup-bin": { labelKo: "컵 전용 수거함", description: "다회용 또는 일회용 컵을 별도 회수하는 장소", findable: true, externalSearchQuery: "컵 전용 수거함" },
  "donation-center": { labelKo: "기부·재사용 매장", description: "사용 가능한 물품을 기부받는 기관", findable: true, externalSearchQuery: "재사용 기부 매장" },
  "food-waste-bin": { labelKo: "음식물류 폐기물 수거함", description: "지역 규정에 따라 음식물류 폐기물을 배출하는 곳", findable: false, externalSearchQuery: "음식물 쓰레기 배출" },
  "general-waste": { labelKo: "종량제 배출", description: "지역 지정 시간과 장소에 종량제 봉투로 배출", findable: false, externalSearchQuery: "주민센터" },
  "glass-bin": { labelKo: "유리병 수거함", description: "재활용 가능한 유리병을 수거하는 장소", findable: true, externalSearchQuery: "유리병 수거함" },
  "hazardous-waste": { labelKo: "생활계 유해폐기물 수거처", description: "위험성이 있는 생활폐기물을 별도 수거하는 장소", findable: true, externalSearchQuery: "생활계 유해폐기물 수거" },
  "health-center": { labelKo: "보건소", description: "보건 관련 지정 폐기물을 접수하는 공공기관", findable: true, externalSearchQuery: "보건소" },
  "lamp-box": { labelKo: "폐형광등 수거함", description: "깨지지 않은 폐형광등을 수거하는 장소", findable: true, externalSearchQuery: "폐형광등 수거함" },
  "manufacturer-takeback": { labelKo: "제조사 회수", description: "제조사나 판매처의 품목별 회수 프로그램", findable: false, externalSearchQuery: "제조사 회수 프로그램" },
  "medicine-box": { labelKo: "폐의약품 수거함", description: "사용하지 않는 의약품을 별도 수거하는 장소", findable: true, externalSearchQuery: "폐의약품 수거함" },
  "non-combustible-waste": { labelKo: "불연성 폐기물 배출", description: "지역 전용 마대 등으로 지정 방식에 따라 배출", findable: false, externalSearchQuery: "불연성 폐기물 배출" },
  "paper-bin": { labelKo: "종이류 수거함", description: "깨끗한 종이류를 별도 수거하는 장소", findable: true, externalSearchQuery: "종이류 수거함" },
  "paper-cup-bin": { labelKo: "종이컵 수거함", description: "내용물을 비운 종이컵을 별도 수거하는 장소", findable: true, externalSearchQuery: "종이컵 수거함" },
  "paper-pack-bin": { labelKo: "종이팩 수거함", description: "우유팩 등 종이팩을 별도 회수하는 장소", findable: true, externalSearchQuery: "종이팩 수거함" },
  "pet-bottle-bin": { labelKo: "투명 페트병 수거함", description: "투명 페트병을 별도 수거하는 장소", findable: true, externalSearchQuery: "투명 페트병 수거함" },
  "plastic-bin": { labelKo: "플라스틱 수거함", description: "재활용 가능한 플라스틱을 수거하는 장소", findable: true, externalSearchQuery: "플라스틱 수거함" },
  "recycling-station": { labelKo: "재활용 정거장", description: "여러 재활용 품목을 분리 수거하는 거점", findable: true, externalSearchQuery: "재활용 정거장" },
  "reuse-box": { labelKo: "재사용 나눔함", description: "사용 가능한 생활용품을 재사용 목적으로 수거하는 곳", findable: true, externalSearchQuery: "재사용 나눔함" },
  "small-electronics": { labelKo: "소형 폐가전 수거함", description: "소형 전기·전자제품을 별도 수거하는 장소", findable: true, externalSearchQuery: "소형 폐가전 수거함" },
  "styrofoam-bin": { labelKo: "스티로폼 수거함", description: "깨끗한 발포합성수지 포장재를 수거하는 장소", findable: true, externalSearchQuery: "스티로폼 수거함" },
  "textile-collection": { labelKo: "폐섬유 수거처", description: "재사용이 어려운 섬유류의 지역별 수거처", findable: true, externalSearchQuery: "폐섬유 수거" },
  "vinyl-bin": { labelKo: "비닐류 수거함", description: "깨끗한 비닐 포장재를 수거하는 장소", findable: true, externalSearchQuery: "비닐류 수거함" },
} satisfies Record<CollectionSpotType, CollectionSpotTypeMetadata>;
