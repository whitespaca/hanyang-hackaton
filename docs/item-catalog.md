# 품목 catalog와 검색

## 단일 데이터 원본

`data/disposal-guides.ko.json` 한 파일이 검색 품목과 AI 세부 가이드를 함께 관리합니다. `categories`는 canonical 10개 AI 대분류 metadata이고, flat `items` 배열은 Web·Mobile 검색 및 기존 `/guides` endpoint의 실제 내용입니다. `classificationCategory`가 `null`인 특수 품목도 검색할 수 있지만 AI 대분류에 억지로 포함하지 않습니다.

각 품목은 kebab-case 전역 ID, 한국어 이름과 alias, 검색 keyword, nullable AI 분류, 그룹, 재활용 구분, 요약, 2개 이상의 단계, 주의사항, 1개 이상의 이유, 배출 장소 유형, 지역 안내, 출처와 `YYYY-MM-DD` 확인일을 가집니다. source URL을 확인할 수 없으면 가짜 주소 대신 `null`을 사용합니다.

## 검색 순위

검색 문자열은 Unicode NFKC로 정규화하고 소문자로 변환한 뒤 한글·영문·숫자 이외의 공백, 하이픈과 일반 구두점을 제거합니다. 직접 결과는 다음 순서로 점수를 받습니다.

1. 이름 exact
2. alias exact
3. 이름 prefix
4. alias prefix
5. 이름 substring
6. alias substring
7. keyword exact, prefix, substring
8. 정규화 token all-match

동점은 popular 품목 우선, 이후 원본 data order로 안정 정렬합니다. 길이 2 이상의 query에만 Python `difflib.SequenceMatcher` 기반 제한된 fuzzy 후보를 만들며, 직접 결과와 suggestion은 중복되지 않습니다. 초성 검색과 외부 검색 dependency는 사용하지 않습니다.

## 최근 검색과 개인정보

- Web: `localStorage` key `bunrishot:recent-searches:v1`
- Mobile: AsyncStorage key `bunrishot:recent-searches:v1`
- shape: `itemId`, `query`, `nameKo`, ISO `searchedAt`
- item ID 기준 중복 제거, 최신순, 최대 20개, 개별·전체 삭제

최근 AI 기록 `bunrishot:history:v1`과는 분리됩니다. 검색어는 API의 SQLite에 저장하지 않고 원본 이미지나 로컬 이미지 URI도 어느 기록에도 넣지 않습니다.

## 출처와 지역 차이

현재 catalog는 공공데이터포털의 기후에너지환경부 분리배출 정보조회 서비스 등 공식 안내를 바탕으로 보수적으로 요약합니다. runtime에 공공 API 또는 service key를 요구하지 않습니다. 모든 상세은 관할 지자체와 수거처에 따라 기준이 다를 수 있음을 안내하며, 위험 품목의 warning을 단계보다 먼저 표시합니다.

데이터 변경 후 실행:

```powershell
pnpm validate:guides
pnpm --filter api test
```
