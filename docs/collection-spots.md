# 수거 장소 데이터와 지도

## 범위와 데이터 출처

`data/collection-spots.ko.json`은 외부 credential 없이 장소 찾기 UX를 시연하기 위한 정적 fixture입니다. 현재 범위는 **강원특별자치도 춘천시 동면**이며, 춘천시가 공공데이터포털에 공개한 위치기반 생활쓰레기 배출장소와 의류수거함 원문 CSV에서 주소·좌표·세부 위치·데이터 기준일을 확인한 20곳만 포함합니다.

- data mode: `fixture`
- 장소 수: 20
- 실제 위치가 포함된 유형: `recycling-station`, `clothes-bin`, `textile-collection`
- 장소 데이터 기준일: 재활용 배출장소 2022-12-15, 의류수거함 2025-11-17
- fixture 작성 시 확인일: 2026-07-19
- sources:
  - <https://www.data.go.kr/data/15111003/fileData.do>
  - <https://www.data.go.kr/data/15108522/fileData.do>

재활용 배출장소 자료는 2022년 구축 자료이므로 현재 운영 여부와 배출 시간이 달라졌을 수 있습니다. UI는 시연용 데이터와 기준일을 표시하고 방문 전 춘천시 안내 확인을 요청합니다. 검증된 좌표가 없는 다른 유형은 임의 장소를 만들지 않고 카카오맵 검색 링크를 제공합니다. 공공 API는 service key와 응답 계약이 운영 환경에 준비되기 전까지 runtime dependency로 사용하지 않습니다.

## canonical 장소 유형

25개 ID와 한국어 label, 설명, 위치 검색 가능 여부, 외부 검색어는 `packages/shared/src/spotTypes.ts`가 source of truth입니다. 품목 catalog의 `spotTypes`와 장소 fixture의 `spotTypes`는 shared Zod와 API Pydantic enum에서 같은 ID만 허용합니다. `general-waste`, `food-waste-bin`, `bulky-waste`, `non-combustible-waste`, `manufacturer-takeback`처럼 고정 수거함 좌표가 부적합한 유형은 nearby 대상에서 제외합니다.

```powershell
pnpm validate:guides
pnpm validate:spots
```

장소 validator는 metadata, 최소 장소 수, ID, 좌표, 유형, source URL/날짜와 실제 fixture가 커버하지 못하는 external-only 유형을 보고합니다.

## 위치 개인정보

- Web/Mobile은 사용자가 `현재 위치 사용`을 누를 때만 foreground 위치를 요청합니다.
- 좌표는 nearby 계산 요청 body와 현재 화면 state에서만 사용합니다.
- 좌표를 SQLite, localStorage, AsyncStorage 또는 custom application log에 저장하지 않습니다.
- API는 `POST /api/v1/spots/nearby` body로 좌표를 받고 계산 후 폐기합니다.
- 권한 거부·timeout·위치 미지원에도 기본 목록과 외부 지도 링크를 유지합니다.

## Kakao 지도 설정

Web 지도는 optional입니다. `apps/web/.env.local`에 Kakao Developers의 **JavaScript 키**를 설정하고 개발·배포 Web domain을 앱 플랫폼에 등록합니다.

```dotenv
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=your_javascript_key
```

`NEXT_PUBLIC_` 값은 browser bundle에 포함되는 public app key입니다. Admin key, REST API key 또는 secret을 넣지 않습니다. 키가 비어 있거나 domain 등록이 맞지 않거나 SDK load가 실패하면 접근 가능한 장소 목록과 카카오 외부 링크만 표시합니다. CI는 실제 Kakao network나 credential에 의존하지 않습니다.

Mobile은 native map SDK를 포함하지 않습니다. `expo-location`으로 foreground 위치를 얻고, `expo-clipboard`로 주소를 복사하며 카카오맵 universal web link로 장소 보기·길찾기를 엽니다.

## 수동 QA

- [ ] 실제 JavaScript key와 localhost domain으로 Web marker smoke
- [ ] 배포 domain 등록 후 Web marker smoke
- [ ] Web 위치 허용·거부·timeout
- [ ] Android foreground 위치 허용·거부
- [ ] Android 주소 복사와 외부 카카오맵/길찾기
- [ ] fixture 장소 방문 전 운영기관 정보 재확인
- [ ] iOS physical-device behavior

실행하지 않은 항목은 PASS로 간주하지 않습니다.
