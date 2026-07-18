# CODEX.md

## 1. 프로젝트 개요

### 프로젝트명

- 서비스명: **분리샷**
- 영문 코드명: `garbage-ai`
- 제품 형태: Next.js 웹사이트 + React Native/Expo 모바일 앱 + FastAPI AI 백엔드

### 문제 정의

사람들은 일상에서 쓰레기의 재질과 올바른 배출 방법을 즉시 판단하기 어렵다. 검색어를 정확히 알지 못하거나, 같은 대분류 안에서도 품목과 오염 상태에 따라 배출 방식이 달라진다. 이 프로젝트는 사진 기반 AI 분류를 진입점으로 사용하되, AI의 불확실성을 숨기지 않고 사용자 확인과 세부 질문을 통해 실제 행동 지침으로 연결한다.

### 핵심 가치 제안

1. **빠른 진입:** 쓰레기 이름을 몰라도 사진으로 시작한다.
2. **불확실성 공개:** Top 3와 confidence를 표시한다.
3. **사람 중심 보정:** 사용자가 AI 결과를 수정할 수 있다.
4. **행동 중심 안내:** 설명이 아니라 배출 전 체크리스트를 제공한다.
5. **멀티플랫폼:** 현장에서는 모바일, 탐색과 발표에서는 웹을 사용한다.

---

## 2. 성공 기준

### 해커톤 성공 기준

- 심사위원 앞에서 실제 물체 또는 fixture 이미지를 모바일 앱으로 분류한다.
- 같은 API를 웹에서도 호출해 결과를 표시한다.
- AI 예측 결과를 사용자가 확인·수정한다.
- 선택된 품목에 맞는 분리배출 체크리스트가 노출된다.
- 웹 대시보드에 익명 통계가 표시된다.
- 모델 또는 네트워크 장애 시 대체 시연 경로가 존재한다.

### 제품 지표

MVP에서 추적할 지표:

- 총 분류 요청 수
- API 성공률
- 평균 Top 1 confidence
- 사용자 수정률
- 카테고리별 요청 수
- 가이드 완료 체크 수 또는 배출 완료 버튼 수
- 웹/모바일 client 비중

이 지표들은 제품 개선용이며 개인 식별을 목적으로 사용하지 않는다.

---

## 3. 사용자와 사용 시나리오

### Persona A — 즉시 배출 사용자

- 장소: 집, 학교, 행사장
- 상황: 손에 든 쓰레기를 지금 버려야 함
- 요구: 10초 내 결과, 짧은 안내, 카메라 중심
- 주 플랫폼: 모바일 앱

### Persona B — 정보 탐색 사용자

- 상황: 특정 품목의 배출 방법을 미리 찾음
- 요구: 검색, 카테고리 탐색, 설명
- 주 플랫폼: 웹

### Persona C — 심사위원/발표 청중

- 상황: 프로젝트의 사회적 문제, AI 구조, 실사용 가능성을 빠르게 이해해야 함
- 요구: 명확한 랜딩, 실제 체험, 대시보드, 모델 한계 공개
- 주 플랫폼: 웹 + 모바일 연동 데모

---

## 4. 범위

### In scope

- 단일 쓰레기 이미지 분류
- 10개 대분류
- Top 3 예측
- confidence threshold
- 사용자 결과 확인과 수정
- 세부 품목 선택
- 분리배출 가이드
- 웹 업로드 체험
- 모바일 촬영 및 갤러리 선택
- 최근 기록 로컬 저장
- 익명 피드백과 통계
- mock inference

### Out of scope

- 다중 객체 탐지
- 실시간 카메라 스트리밍 분류
- 오염도 자동 판단
- 재질의 화학적 세부 구분
- 위치 기반 지자체 규정 자동 결정
- 계정/권한/소셜 로그인
- 커뮤니티
- 포인트와 리워드
- 운영자 CMS
- 이미지 장기 저장

---

## 5. 기술 스택 및 호환성 정책

### 기준 버전

문서 생성 기준의 우선 버전:

- Node.js 22
- pnpm 10 계열
- Next.js 16.2 계열
- React 19
- Expo SDK 57
- Expo가 관리하는 React Native 호환 버전
- Python 3.12
- FastAPI 0.x 최신 호환 버전
- PyTorch 2.x

### 정책

- 정확한 패치 버전은 lockfile로 고정한다.
- Expo 패키지는 `npx expo install`로 설치한다.
- 프레임워크 최신 버전을 무조건 추종하지 않는다. 생성 당시 정상 빌드되는 조합을 유지한다.
- 보안 또는 치명적 버그가 아니면 해커톤 중 대규모 업그레이드를 하지 않는다.

### 공식 참고 문서

- Next.js: https://nextjs.org/docs
- Expo: https://docs.expo.dev/
- React Native: https://reactnative.dev/docs/getting-started-without-a-framework
- FastAPI: https://fastapi.tiangolo.com/
- PyTorch transfer learning: https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html

---

## 6. 전체 아키텍처

```text
┌──────────────────────┐       ┌────────────────────────┐
│ Next.js Web          │       │ React Native / Expo    │
│ - Landing            │       │ - Camera               │
│ - Upload demo        │       │ - Gallery              │
│ - Guides             │       │ - Prediction confirm  │
│ - Dashboard          │       │ - Recent history       │
└──────────┬───────────┘       └───────────┬────────────┘
           │ HTTPS / JSON / multipart      │
           └──────────────┬─────────────────┘
                          ▼
                ┌────────────────────┐
                │ FastAPI API        │
                │ - Validation       │
                │ - Inference        │
                │ - Guide service    │
                │ - Feedback/stat    │
                └──────────┬─────────┘
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
┌────────────────┐ ┌───────────────┐ ┌────────────────┐
│ PyTorch model  │ │ Guide JSON    │ │ SQLite         │
│ + metadata     │ │ Korean rules  │ │ anonymous data │
└────────────────┘ └───────────────┘ └────────────────┘
```

### 데이터 흐름

1. 사용자가 촬영 또는 업로드한다.
2. 클라이언트는 이미지 크기를 줄이고 API에 multipart로 보낸다.
3. API가 MIME, 크기, 디코딩을 검사한다.
4. 모델이 Top 3를 계산한다.
5. API가 threshold를 기준으로 확인 필요 여부를 반환한다.
6. 사용자가 결과를 확인하거나 수정한다.
7. 사용자가 세부 품목을 선택한다.
8. API 또는 로컬 공통 데이터에서 가이드를 조회한다.
9. 익명 피드백을 저장한다.
10. 웹 통계에 집계가 반영된다.

---

## 7. 모노레포 설계

### 루트

- 패키지 매니저, 공통 명령, Turbo task graph
- 공유 lint/format 설정
- 전체 환경 변수 예제
- 개발자 문서

### `apps/web`

Next.js App Router 애플리케이션.

예상 route:

```text
/
/classify
/guides
/guides/[category]
/dashboard
/about
/model
```

### `apps/mobile`

Expo Router 기반.

예상 route:

```text
app/
├── _layout.tsx
├── index.tsx
├── capture.tsx
├── preview.tsx
├── result.tsx
├── refine.tsx
├── guide.tsx
└── history.tsx
```

실제 구현에서 query parameter로 대형 객체를 전달하지 않는다. 이미지 URI와 결과 상태는 feature store 또는 route-safe 작은 파라미터로 관리한다.

### `apps/api`

FastAPI 애플리케이션.

```text
app/
├── main.py
├── config.py
├── api/v1/
│   ├── health.py
│   ├── classifications.py
│   ├── guides.py
│   ├── feedback.py
│   └── statistics.py
├── core/
│   ├── errors.py
│   ├── logging.py
│   └── request_id.py
├── ml/
│   ├── predictor.py
│   ├── preprocess.py
│   ├── loader.py
│   └── mock_predictor.py
├── repositories/
│   ├── classification_repository.py
│   └── sqlite_repository.py
├── schemas/
└── services/
```

### `packages/shared`

Web/Mobile이 공유하는 런타임 검증 스키마와 API client.

### `data`

가이드와 데모 통계. 데이터 소스와 작성 기준을 README에 기록한다.

### `ml`

학습·평가·export 전용 코드. API 런타임과 격리한다.

---

## 8. Web 상세 명세

### 8.1 랜딩 `/`

#### 목적

문제, 해결 방식, 핵심 CTA를 30초 안에 전달한다.

#### 섹션

1. Hero
   - 제목: “사진 한 장으로 시작하는 올바른 분리배출”
   - 부제: AI가 쓰레기 종류를 분석하고 사용자가 확인한 뒤 배출 방법을 안내한다.
   - CTA: `웹에서 체험하기`, `모바일 앱 보기`
2. 3단계 작동 방식
   - 촬영/업로드
   - AI 분석과 사용자 확인
   - 행동 체크리스트
3. 지원 카테고리 10개
4. AI 한계와 사용자 보정 설명
5. 통계 미리보기
6. Footer

#### 상태

- API health가 실패해도 랜딩은 렌더링되어야 한다.
- 체험 CTA에서 API 상태를 점검하고 실패 시 데모 모드를 안내한다.

### 8.2 분류 체험 `/classify`

#### 입력

- drag and drop
- file picker
- JPG/PNG/WebP
- 최대 8 MiB

#### UI 상태

```text
idle
→ validating
→ preview
→ uploading
→ success | low-confidence | error
→ confirmed
→ refine
→ guide
```

#### 기능

- preview와 파일 제거
- upload progress 또는 최소 spinner
- Top 3 confidence 표시
- “맞아요”와 “다른 결과 선택”
- 낮은 confidence일 때 직접 선택 강조
- 재시도
- fixture 이미지 데모 선택 기능은 선택 사항

### 8.3 가이드 `/guides`

- 텍스트 검색
- 10개 대분류 카드
- 세부 품목 목록
- 카드에 recyclability badge
- 검색 결과 없음 상태

### 8.4 대시보드 `/dashboard`

최소 지표:

- 총 분류 수
- 평균 Top confidence
- 수정률
- 카테고리 분포
- dataMode 표시

차트는 1~2개로 제한한다. 데이터가 적을 때 과장된 분석 문구를 쓰지 않는다.

### 8.5 모델 `/model`

- 데이터셋 소개
- 모델 아키텍처
- 평가 지표
- 클래스별 한계
- 사용자 확인이 필요한 이유
- 개인정보 처리 원칙

실제 측정하지 않은 정확도 수치를 표시하지 않는다. 모델이 아직 mock이면 “모델 준비 중 / 데모 모드”를 표시한다.

---

## 9. Mobile 상세 명세

### 9.1 홈

- 촬영 CTA
- 갤러리 선택 CTA
- 최근 기록 최대 5개
- 짧은 촬영 팁

### 9.2 권한 처리

카메라 접근 시:

- 미결정: 권한 요청
- 허용: 카메라 표시
- 거절: 설정 이동 안내와 갤러리 대안
- 제한: 재요청 루프 금지

### 9.3 촬영

- 중앙 가이드 프레임
- “물건 하나만 가운데 놓아주세요”
- 전/후면 전환은 P1
- 플래시는 P2
- 촬영 후 preview로 이동

### 9.4 이미지 전처리

클라이언트에서:

- EXIF orientation 고려
- 긴 변 약 1280px로 축소
- JPEG 품질 0.75~0.85
- 원본 파일이 작으면 불필요한 재인코딩 최소화

### 9.5 결과

- Top 1 강조
- Top 2~3 보조
- confidence percent
- low confidence 안내
- 사용자 확인 버튼
- 전체 클래스 선택 modal 또는 screen

### 9.6 세부 품목

대분류별 질문 예:

- `glass`: 음료/식품 유리병, 깨진 유리, 거울/도자기/내열유리
- `plastic`: 투명 페트병, 플라스틱 용기, 비닐, 스티로폼, 알 수 없음
- `biological`: 일반 음식물, 뼈/껍데기, 티백/한약재, 알 수 없음
- `metal`: 캔, 고철, 날카로운 금속, 부탄가스/스프레이
- `battery`: 일반 건전지, 충전식 배터리, 보조배터리

모든 클래스에 세부 질문이 필요한 것은 아니다.

### 9.7 가이드

- 제목
- 재활용 상태
- 단계별 체크박스
- 주의사항
- 지역별 차이 고지
- `배출 완료` 버튼

체크 상태는 현재 세션에서만 유지해도 된다.

### 9.8 최근 기록

저장 항목:

```ts
interface HistoryItem {
  id: string;
  predictedClass: GarbageClass;
  selectedClass: GarbageClass;
  subcategory?: string;
  confidence: number;
  createdAt: string;
  thumbnailUri?: string;
}
```

개인정보 최소화를 위해 thumbnail 저장은 기본 비활성 또는 앱 cache URI만 사용한다. 최대 20개를 유지하고 오래된 항목을 제거한다.

---

## 10. API 상세 설계

### 10.1 설정

환경 변수:

```dotenv
APP_ENV=development
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
INFERENCE_MODE=mock
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
DATABASE_URL=sqlite:///./data/app.db
MAX_UPLOAD_BYTES=8388608
CONFIDENCE_THRESHOLD=0.65
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
```

### 10.2 Lifespan

- 설정 로드
- 저장소 초기화/migration
- 모델 또는 mock predictor 초기화
- metadata 검증
- startup 로그
- shutdown cleanup

### 10.3 분류 서비스

Pseudo flow:

```python
async def classify_upload(upload: UploadFile, client: ClientType):
    raw = await read_limited(upload, max_bytes=settings.max_upload_bytes)
    image = decode_and_validate(raw, upload.content_type)
    predictions = predictor.predict(image, top_k=3)
    result = classification_repository.create(...)
    return build_response(result, predictions)
```

### 10.4 request ID

- 요청마다 UUID 생성
- 응답 header `X-Request-ID`
- 오류 응답 body에도 포함
- 로그 correlation에 사용

### 10.5 SQLite schema

#### classifications

```sql
CREATE TABLE classifications (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  predicted_class TEXT NOT NULL,
  top_confidence REAL NOT NULL,
  model_version TEXT NOT NULL,
  inference_mode TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

#### feedback

```sql
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  classification_id TEXT NOT NULL,
  predicted_class TEXT NOT NULL,
  selected_class TEXT NOT NULL,
  subcategory TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(classification_id) REFERENCES classifications(id)
);
```

원본 이미지 경로 필드는 만들지 않는다.

### 10.6 API 상태 코드

- 200: 조회/분류 성공
- 201: feedback 생성
- 400: 의미적으로 잘못된 요청
- 404: 가이드 또는 분류 ID 없음
- 413: 파일 크기 초과
- 415: 지원하지 않는 미디어 타입
- 422: 이미지 디코딩/스키마 검증 실패
- 503: 모델 비가용 또는 추론 timeout

---

## 11. 분리배출 가이드 데이터 설계

`data/disposal-guides.ko.json`을 source of truth로 사용한다.

예상 구조:

```json
{
  "version": "2026-07-18",
  "locale": "ko-KR",
  "disclaimer": "일반적인 분리배출 원칙이며 지역별 기준이 다를 수 있습니다.",
  "categories": [
    {
      "id": "plastic",
      "label": "플라스틱",
      "description": "플라스틱류 대분류",
      "subcategories": [
        {
          "id": "pet-bottle",
          "label": "투명 페트병",
          "recyclability": "yes",
          "steps": [
            "내용물을 완전히 비웁니다.",
            "물로 가볍게 헹굽니다.",
            "라벨을 제거합니다.",
            "찌그러뜨린 뒤 뚜껑을 닫아 배출합니다."
          ],
          "warnings": [
            "지역별 전용 배출함 운영 여부를 확인하세요."
          ],
          "keywords": ["페트병", "생수병", "음료병"]
        }
      ]
    }
  ]
}
```

검증 스크립트는 다음을 검사한다.

- category ID 중복 없음
- subcategory ID 중복 없음
- 모든 AI class가 category로 존재
- steps 최소 1개
- recyclability enum 유효
- keywords 빈 문자열 없음

---

## 12. ML 설계

### 12.1 목표

최고 연구 성능보다 짧은 시간 안에 재현 가능한 추론 artifact를 만든다.

### 12.2 모델

기본:

- `torchvision.models.mobilenet_v3_small`
- ImageNet pretrained weights
- 마지막 classifier를 10개 클래스로 교체

대체:

- EfficientNet-B0: 서버 추론과 학습 여유가 있을 때
- Mock predictor: 모델 학습/배포가 막혔을 때

### 12.3 데이터 검증

학습 전에 script가 출력해야 할 것:

- 전체 이미지 수
- 클래스 목록
- 클래스별 이미지 수
- 손상 이미지 수
- split 구조
- 중복 파일 또는 동일 hash 후보
- 클래스 imbalance 비율

폴더명이 예상 클래스와 다르면 명시적 mapping을 요구한다. 조용히 임의 매핑하지 않는다.

### 12.4 Split

- 데이터셋이 공식 train/validation/test를 제공하면 이를 우선한다.
- 단일 폴더만 있으면 stratified split을 사용한다.
- 기본 비율: 80/10/10
- seed 고정: 42
- 동일 이미지가 서로 다른 split에 들어가지 않도록 주의한다.

### 12.5 Transform

Train:

- RandomResizedCrop(224, scale 0.75~1.0)
- RandomHorizontalFlip
- RandomRotation 약 10도
- 약한 ColorJitter
- ToTensor
- ImageNet Normalize

Validation/Test:

- Resize
- CenterCrop
- ToTensor
- Normalize

재질 단서가 사라질 정도의 강한 색상 변경을 피한다.

### 12.6 Training

1단계:

- backbone freeze
- classifier 3~5 epoch
- AdamW
- lr 약 1e-3

2단계:

- 마지막 feature block 일부 unfreeze
- 2~5 epoch
- lr 약 1e-4

Imbalance:

- weighted cross entropy 또는 weighted sampler 중 하나
- 둘을 동시에 적용할 때 과보정 여부를 검증

### 12.7 Metrics

- accuracy
- macro precision/recall/F1
- per-class precision/recall/F1
- top-3 accuracy
- confusion matrix
- validation loss

발표에는 실제 test 결과만 사용한다.

### 12.8 Checkpoint

최고 validation macro F1 checkpoint를 저장한다.

```text
runs/<run-id>/
├── config.json
├── metrics.json
├── best.pt
├── confusion-matrix.png
└── class-counts.json
```

### 12.9 Export

API용 TorchScript 또는 state dict + architecture metadata 중 하나를 사용한다. 해커톤 안정성 기준으로는 다음이 단순하다.

- state dict
- 모델 이름 metadata
- class order metadata
- input size/normalization metadata

ONNX는 P2이다.

### 12.10 Model card

`docs/model-card.md`에 포함:

- 데이터셋
- 클래스
- 모델
- 학습 날짜
- split
- 주요 지표
- 알려진 실패 사례
- 의도된 사용
- 금지된 사용
- 개인정보 원칙

---

## 13. 공유 API 클라이언트

`packages/shared/src/api-client`에서 fetch wrapper를 제공한다.

요구 사항:

- base URL 주입
- timeout
- JSON 오류 parsing
- Zod 응답 검증
- multipart classification
- request ID 보존

예시 인터페이스:

```ts
export interface GarbageApiClient {
  health(): Promise<HealthResponse>;
  classify(input: ClassifyInput): Promise<ClassificationResponse>;
  listGuides(): Promise<GuidesResponse>;
  getGuide(category: GarbageClass, subcategory?: string): Promise<GuideResponse>;
  submitFeedback(input: FeedbackInput): Promise<FeedbackResponse>;
  getStatistics(): Promise<StatisticsResponse>;
}
```

Next.js server와 browser, React Native에서 사용할 수 있도록 Node 전용 API에 의존하지 않는다.

---

## 14. 상태 관리

### Web

- 서버 데이터: 단순 fetch 또는 TanStack Query 선택 가능
- 폼/업로드 로컬 상태: component state 또는 reducer
- 전역 store는 필요성이 확인되지 않으면 추가하지 않는다.

### Mobile

분류 flow가 여러 screen을 거치므로 작은 feature store를 허용한다.

예:

```ts
interface ClassificationFlowState {
  imageUri?: string;
  predictions: ClassificationPrediction[];
  classificationId?: string;
  selectedClass?: GarbageClass;
  selectedSubcategory?: string;
  reset(): void;
}
```

Zustand를 추가할 수 있으나 Context + reducer로 충분하면 의존성을 줄인다.

---

## 15. 디자인 시스템

### 시각 원칙

- 깨끗한 환경/공공 서비스 느낌
- 과도한 친환경 클리셰와 장식 제한
- 상태와 행동을 명확히 구분
- 카드와 충분한 여백

### 토큰 예

실제 색상은 디자인 단계에서 결정하되 semantic token을 사용한다.

```ts
const tokens = {
  color: {
    background: "...",
    surface: "...",
    text: "...",
    textMuted: "...",
    primary: "...",
    success: "...",
    warning: "...",
    danger: "...",
    border: "...",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};
```

### 공통 UI 패턴

- PrimaryButton
- SecondaryButton
- StatusBadge
- PredictionBar
- EmptyState
- ErrorState
- LoadingState
- GuideChecklist
- CategoryCard

웹과 모바일 컴포넌트 구현은 분리하되 의미와 naming은 맞춘다.

---

## 16. 환경 변수

### Root `.env.example`

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8000
```

### Web

- `NEXT_PUBLIC_API_BASE_URL`
- server-only 시크릿은 현재 MVP에 없음

### Mobile

- `EXPO_PUBLIC_API_BASE_URL`
- 실제 기기에서 `localhost`는 개발 PC가 아님을 README에 강조

### API

- `INFERENCE_MODE`
- `MODEL_PATH`
- `MODEL_METADATA_PATH`
- `DATABASE_URL`
- `MAX_UPLOAD_BYTES`
- `CONFIDENCE_THRESHOLD`
- `CORS_ORIGINS`

---

## 17. 로컬 개발 절차

### 17.1 사전 조건

- Node.js 22
- pnpm
- Python 3.12
- uv 권장
- Expo Go 또는 Android/iOS simulator

### 17.2 설치

```bash
pnpm install
cd apps/api
uv sync
```

### 17.3 API

```bash
cd apps/api
cp .env.example .env
uv run fastapi dev app/main.py --host 0.0.0.0
```

### 17.4 Web

```bash
pnpm dev:web
```

### 17.5 Mobile

개발 PC의 LAN IP를 `EXPO_PUBLIC_API_BASE_URL`에 설정한다.

```bash
pnpm dev:mobile
```

### 17.6 Mock demo

```dotenv
INFERENCE_MODE=mock
```

이 모드에서 fixture 이미지별 deterministic 결과가 나와야 한다.

---

## 18. 테스트 전략

### Unit

- JSON guide validation
- confidence threshold 계산
- prediction sorting/top K
- API error parsing
- history capacity 관리
- statistics aggregation

### Integration

- classification multipart endpoint
- SQLite repository
- feedback → statistics 반영
- shared API client와 mock server

### Component

- PredictionBar
- GuideChecklist
- UploadDropzone
- Camera permission state

### E2E

우선 웹 한 경로를 완성한다.

- fixture 업로드
- 결과
- 확인
- 세부 선택
- 가이드

모바일 E2E는 12시간 범위에서 제외 가능하다. 대신 실제 기기 수동 체크리스트를 제공한다.

---

## 19. 수동 QA 체크리스트

### Web

- [ ] 360px 모바일 너비
- [ ] 1440px 발표 화면
- [ ] 키보드로 업로드 버튼 접근
- [ ] 8 MiB 초과 파일
- [ ] 잘못된 확장자
- [ ] 손상 이미지
- [ ] API 중단
- [ ] low confidence
- [ ] 결과 수정
- [ ] 가이드 검색 결과 없음
- [ ] demo/live 통계 표기

### Mobile

- [ ] 카메라 권한 허용
- [ ] 카메라 권한 거절
- [ ] 갤러리 권한
- [ ] 실제 기기에서 API 접속
- [ ] 세로 화면
- [ ] 네트워크 끊김
- [ ] 재시도
- [ ] 최근 기록 재실행 후 유지
- [ ] 긴 한국어 문구 잘림 없음
- [ ] Android back 동작

### API

- [ ] model mode startup
- [ ] mock mode startup
- [ ] 파일 크기 제한
- [ ] CORS
- [ ] request ID
- [ ] SQLite 생성
- [ ] health model status

---

## 20. 배포

### Web

- Vercel 또는 Node/Docker 배포
- 환경 변수에 공개 API URL 설정
- build 전 `pnpm lint`, `pnpm typecheck`, `pnpm test`

### API

- Docker 배포 권장
- 모델 artifact를 image에 포함하거나 volume으로 mount
- CPU 환경에서 inference 성능 확인
- health endpoint 사용
- CORS에 배포된 web origin 추가

### Mobile

해커톤 시연 우선순위:

1. Expo Go
2. EAS preview build
3. APK/IPA 배포

시간이 제한되면 스토어 제출은 하지 않는다.

### Docker API 예시 원칙

- slim Python base
- non-root user
- dependency layer caching
- 모델 파일 존재 여부 검사
- 한 프로세스로 시작하고 필요할 때 worker 확장
- healthcheck

---

## 21. 12시간 실행 계획

### 0:00–0:30 — 계약 고정

- API schema
- 클래스 순서
- repo 생성
- 역할 분담
- P0 확정

### 0:30–2:00 — 뼈대

- pnpm workspace
- Next.js 생성
- Expo 생성
- FastAPI 생성
- shared types
- guide JSON 초안
- mock API

완료 조건: 웹과 모바일에서 mock classification 호출 가능.

### 2:00–4:00 — 핵심 UI

- 웹 업로드
- 모바일 촬영/갤러리
- preview
- Top 3 결과
- 오류 상태

### 4:00–6:00 — 사용자 확인과 가이드

- 클래스 수정
- 세부 품목
- 체크리스트
- feedback API
- 최근 기록

완료 조건: end-to-end 사용자 흐름 완성.

### 6:00–8:00 — 실제 모델

- 데이터 검증
- transfer learning
- checkpoint
- API predictor 연결

모델이 지연되면 mock UI 개발을 중단하지 않는다.

### 8:00–9:30 — 통계와 발표 화면

- statistics endpoint
- dashboard
- model page
- data mode 표시

### 9:30–10:30 — 통합 QA

- 실제 스마트폰 API 연결
- CORS
- 파일 크기
- low confidence
- 오류 메시지

### 10:30–11:30 — 배포와 백업

- 웹 배포
- API 배포 또는 LAN 준비
- Expo Go QR
- fixture 이미지
- 시연 녹화

### 11:30–12:00 — 발표 리허설

- 2분/5분 시나리오
- 모델 한계 설명
- offline fallback 확인

---

## 22. 역할 분담

### 1인

- P0만 구현
- Web은 랜딩 + classify
- Mobile은 촬영 + 결과 + 가이드
- API는 mock 우선, 모델은 기존 checkpoint 사용 가능
- 통계는 demo 데이터 허용

### 2인

- A: API + ML
- B: Web + Mobile
- shared schema를 먼저 고정한다.

### 3인

- A: ML/API
- B: Web
- C: Mobile

### 4인 이상

- 추가 인력: QA/디자인/발표/데이터 검증

---

## 23. 데모 시나리오

### 기본 시연

1. 웹 랜딩에서 문제 설명
2. 웹에 준비된 골판지 이미지를 업로드
3. Top 3와 confidence 표시
4. `Cardboard` 확인
5. 테이프/송장 제거 체크리스트 표시
6. 모바일 앱으로 실제 캔 촬영
7. `Metal` 결과 확인
8. 세부 종류 `캔` 선택
9. 배출 완료
10. 웹 대시보드 새로고침 후 카테고리 수 증가 확인

### AI 실패를 활용한 시연

1. 투명 플라스틱 컵을 촬영
2. Plastic 57%, Glass 32% 표시
3. 앱이 “정확히 판단하기 어렵습니다” 안내
4. 사용자가 Plastic을 선택
5. 세부 품목 선택
6. 최종 지침 표시

메시지: “AI가 판단을 대체하는 것이 아니라, 사용자가 올바른 행동을 빠르게 선택하도록 돕습니다.”

---

## 24. 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 모델 학습 지연 | 실제 AI 시연 불가 | mock mode, 사전 checkpoint |
| 실제 사진 domain shift | 정확도 저하 | 촬영 가이드, Top 3, 사용자 수정 |
| Expo 기기에서 localhost 불가 | API 연결 실패 | LAN IP 설정, README 경고 |
| CORS | 웹 호출 실패 | 환경 변수 origin 목록 |
| API 배포 메모리 부족 | model load 실패 | MobileNetV3, CPU, worker 1 |
| 통계 데이터 부족 | 대시보드 빈 화면 | demo mode 명시 |
| 지역별 분리배출 차이 | 잘못된 단정 | 일반 원칙 및 지역 확인 고지 |
| 데이터셋 라이선스/출처 누락 | 발표 신뢰 저하 | dataset attribution와 model card |

---

## 25. 최종 인수 기준

### 기능

- [ ] 웹에서 이미지 업로드 가능
- [ ] 모바일에서 촬영 또는 갤러리 선택 가능
- [ ] 같은 분류 API 사용
- [ ] Top 3 표시
- [ ] confidence 표시
- [ ] low confidence 처리
- [ ] 사용자 클래스 수정
- [ ] 세부 품목 선택
- [ ] 체크리스트 표시
- [ ] feedback 저장
- [ ] 통계 표시
- [ ] mock mode

### 품질

- [ ] lint
- [ ] typecheck
- [ ] API tests
- [ ] web 핵심 테스트
- [ ] Expo doctor
- [ ] README 실행 절차
- [ ] `.env.example`
- [ ] 모델 카드
- [ ] 시연 백업

### 안전

- [ ] 원본 이미지 미저장
- [ ] 파일 크기 제한
- [ ] MIME/디코딩 검증
- [ ] production CORS 제한
- [ ] 비밀값 미커밋
- [ ] demo/live 데이터 구분

---

## 26. 향후 확장

MVP 이후 순서:

1. 사용자 피드백 기반 active learning dataset
2. 한국 실사용 사진 fine-tuning
3. 세부 품목 분류
4. 지자체별 규정
5. 수거함 지도
6. object detection
7. on-device inference
8. 다국어 안내

MVP 구현에서는 이 확장성을 위해 API와 타입 경계를 유지하되, 미리 복잡한 인프라를 구축하지 않는다.
