# 분리배출 가이드 데이터

`disposal-guides.ko.json`은 분리샷의 한국어 행동 가이드 원본이자 단일 품목 catalog입니다. 최상위 `categories`는 canonical 10개 AI 대분류 순서를 유지하고, `items`는 검색과 기존 AI 세부 가이드가 함께 사용하는 flat 배열입니다. 일반 원칙을 요약한 자료이며 법적·지자체별 확정 규정이 아닙니다.

품목을 수정한 뒤 루트에서 `pnpm validate:guides`를 실행하세요. validator는 40~50개 품목, ID·정규화 이름·alias의 전역 유일성, 최소 단계와 이유, 출처 확인일, AI 대분류별 최소 한 품목을 검사합니다. 상세 작성 규칙은 `docs/item-catalog.md`에 있습니다.
