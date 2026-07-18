# AGENTS.md

## 0. 문서 목적

이 파일은 이 저장소에서 작업하는 모든 AI 코딩 에이전트와 사람 개발자가 따라야 하는 **최상위 작업 규칙**이다. 에이전트는 구현을 시작하기 전에 이 파일과 루트의 `CODEX.md`를 반드시 읽고, 두 문서가 충돌할 경우 다음 우선순위를 따른다.

1. 사용자의 현재 명시적 지시
2. `AGENTS.md`
3. `CODEX.md`
4. 각 패키지 내부의 로컬 문서와 코드 관례
5. 일반적인 프레임워크 관례

이 프로젝트는 12시간 해커톤에서 완성 가능한 범위를 목표로 하는 **AI 기반 분리배출 플랫폼**이다. 동일한 FastAPI 백엔드를 React Native 모바일 앱과 Next.js 웹사이트가 공유한다.

---

## 1. 제품 한 문장 정의

사용자가 쓰레기 사진을 촬영하거나 업로드하면 AI가 10개 대분류를 예측하고, 사용자가 결과를 확인·수정한 뒤 한국형 분리배출 행동 지침을 제공받는 멀티플랫폼 서비스.

---

## 2. 절대 준수 제약

### 2.1 해커톤 범위

- 핵심 시연 경로는 반드시 동작해야 한다.
- 로그인, 결제, 커뮤니티, 푸시 알림, 지도, 실시간 영상 분석은 MVP에 넣지 않는다.
- 여러 물체 동시 탐지는 구현하지 않는다.
- AI는 단일 이미지의 대표 물체 하나를 10개 대분류 중 하나로 분류한다.
- 실제 분리배출 결정은 AI 예측만으로 확정하지 않는다. 사용자 확인 또는 세부 질문 단계를 둔다.
- 웹과 모바일은 별도 백엔드를 만들지 않는다.
- 기능 수보다 시연 안정성, 오류 처리, 응답 속도를 우선한다.

### 2.2 데이터셋 및 모델

기본 데이터셋은 Kaggle의 `Garbage Classification V2`이다.

- URL: https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2
- 예상 클래스: `metal`, `glass`, `biological`, `paper`, `battery`, `trash`, `cardboard`, `shoes`, `clothes`, `plastic`
- 실제 파일 수, 폴더명, split 구조는 로컬 다운로드 결과를 기준으로 검증한다.
- 데이터셋 이미지와 학습 산출물은 Git에 커밋하지 않는다.
- 모델 파일이 없어도 프런트엔드와 API를 시연할 수 있는 `mock inference mode`를 유지한다.

### 2.3 기술 기본값

설치 시점에 패키지 호환성을 확인하되 다음 계열을 우선한다.

- Node.js 22 LTS
- pnpm workspace
- Next.js 16 App Router
- React 19
- Expo SDK 57
- React Native 0.86 계열 또는 Expo SDK가 고정하는 호환 버전
- TypeScript strict mode
- Python 3.12
- FastAPI
- PyTorch + torchvision
- SQLite 또는 파일 기반 JSON 저장소
- Vitest 또는 Jest, React Testing Library, Pytest

**중요:** Expo SDK가 요구하는 React Native 버전을 직접 덮어쓰지 않는다. `npx expo install`을 사용해 Expo 관리 패키지의 호환 버전을 설치한다.

---

## 3. 저장소 목표 구조

```text
garbage-ai/
├── AGENTS.md
├── CODEX.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .editorconfig
├── .gitignore
├── .env.example
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── public/
│   │   └── tests/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── assets/
│   │   └── tests/
│   └── api/
│       ├── app/
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── api/
│       │   ├── core/
│       │   ├── ml/
│       │   ├── repositories/
│       │   ├── schemas/
│       │   └── services/
│       ├── tests/
│       ├── scripts/
│       ├── models/
│       └── pyproject.toml
├── packages/
│   ├── shared/
│   │   ├── src/types/
│   │   ├── src/constants/
│   │   ├── src/schemas/
│   │   └── src/api-client/
│   └── config/
├── data/
│   ├── disposal-guides.ko.json
│   ├── mock-statistics.json
│   └── README.md
├── ml/
│   ├── README.md
│   ├── train.py
│   ├── evaluate.py
│   ├── export.py
│   ├── dataset.py
│   └── configs/
└── docs/
    ├── api.md
    ├── model-card.md
    ├── demo-script.md
    └── troubleshooting.md
```

에이전트는 기존 구조가 있다면 무조건 재생성하지 말고, 먼저 실제 파일을 조사한 후 최소 변경으로 정렬한다.

---

## 4. 에이전트 작업 계약

### 4.1 작업 시작 전

에이전트는 코드 수정 전에 다음을 수행한다.

1. 루트 파일 목록 확인
2. `AGENTS.md`, `CODEX.md`, `README.md`, 패키지 매니페스트 읽기
3. 현재 브랜치와 변경 파일 확인
4. 실행 가능한 명령과 이미 존재하는 테스트 파악
5. 요청을 작은 작업 단위로 분해
6. 구현 전에 위험 요소와 외부 의존성을 식별

### 4.2 수정 원칙

- 관련 없는 파일을 정리하거나 포맷하지 않는다.
- 대규모 리팩터링보다 수직 기능 단위의 작은 변경을 선호한다.
- 새 추상화는 같은 패턴이 최소 두 번 이상 반복되거나 경계 분리가 명확할 때만 만든다.
- 공개 API 계약을 바꿀 때는 웹, 모바일, 공유 타입, 문서를 동시에 갱신한다.
- 임시 하드코딩은 `TODO(hackathon)` 주석과 제거 조건을 명시한다.
- 오류를 삼키지 않는다. 사용자 메시지와 개발자 로그를 분리한다.
- 시크릿, 토큰, Kaggle 자격 증명, 실제 데이터셋, 모델 바이너리를 커밋하지 않는다.
- 요청하지 않은 의존성을 추가하지 않는다. 추가 시 이유를 남긴다.
- 테스트를 통과시키기 위해 테스트 자체를 약화하지 않는다.

### 4.3 작업 종료 전

가능한 범위에서 다음을 실행한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter mobile exec expo-doctor
cd apps/api && uv run pytest
```

전체 실행이 환경상 불가능하면 다음을 명확히 보고한다.

- 실행한 명령
- 성공/실패 결과
- 실행하지 못한 항목
- 원인
- 재현 명령

---

## 5. 모노레포 명령 규약

루트 `package.json`은 최소 다음 스크립트를 제공해야 한다.

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "pnpm --filter web dev",
    "dev:mobile": "pnpm --filter mobile start",
    "dev:api": "pnpm --filter api dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "build": "turbo build",
    "format": "prettier --write .",
    "check": "pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

Python 명령은 `uv`를 기본으로 하되, 환경에 `uv`가 없으면 `python -m venv`와 `pip` 대체 절차를 문서화한다.

예상 개발 명령:

```bash
pnpm install
pnpm dev:web
pnpm dev:mobile
pnpm dev:api
```

API 직접 실행:

```bash
cd apps/api
uv sync
uv run fastapi dev app/main.py
```

ML 학습:

```bash
cd ml
python train.py --data-dir /absolute/path/to/dataset --output-dir ../apps/api/models
```

---

## 6. 아키텍처 경계

### 6.1 Web

웹은 다음 책임만 가진다.

- 랜딩과 문제 정의
- 이미지 업로드 기반 AI 체험
- 품목/카테고리별 분리배출 가이드 탐색
- 익명 집계 통계 표시
- 프로젝트 및 모델 설명

웹에서 PyTorch 추론을 직접 실행하지 않는다. 웹은 공통 API 클라이언트로 FastAPI를 호출한다.

### 6.2 Mobile

모바일은 다음 책임만 가진다.

- 카메라 권한과 촬영
- 갤러리 이미지 선택
- 이미지 압축 및 업로드
- AI Top 3 결과 표시
- 사용자 결과 확인/수정
- 세부 품목 질문
- 분리배출 체크리스트
- 최근 기록의 로컬 저장

모바일의 최근 기록은 AsyncStorage에 저장하고 민감한 이미지 원본은 기본적으로 저장하지 않는다.

### 6.3 API

API는 다음 책임을 가진다.

- 이미지 유효성 검사
- 전처리와 모델 추론
- 신뢰도와 Top K 계산
- 가이드 조회
- 익명 피드백/통계 저장
- 헬스 체크 및 모델 상태 노출

API는 UI 문자열을 과도하게 결정하지 않는다. 다만 한국어 배출 가이드는 공통 JSON을 읽어 구조화된 응답으로 제공할 수 있다.

### 6.4 Shared package

`packages/shared`에는 다음만 둔다.

- API request/response TypeScript 타입
- Zod 스키마
- 카테고리 상수와 라벨
- API 클라이언트
- UI 비종속 순수 함수

React 컴포넌트, Expo 전용 코드, Next.js 전용 코드는 공유 패키지에 넣지 않는다.

### 6.5 ML

ML 코드의 책임:

- 데이터셋 탐색과 클래스 검증
- 재현 가능한 split 또는 기존 split 사용
- augmentation
- transfer learning
- weighted loss 또는 sampler
- 평가 지표 생성
- 추론용 artifact와 metadata export

서비스 코드는 학습 코드를 import하지 않는다. 서비스는 export된 모델과 metadata만 사용한다.

---

## 7. API 계약

모든 API는 `/api/v1` 아래에 둔다.

### 7.1 Health

```http
GET /api/v1/health
```

```json
{
  "status": "ok",
  "service": "garbage-ai-api",
  "modelLoaded": true,
  "modelVersion": "mobilenetv3-small-gcv2-001",
  "inferenceMode": "model"
}
```

### 7.2 Classification

```http
POST /api/v1/classifications
Content-Type: multipart/form-data
```

필드:

- `image`: 필수 이미지 파일
- `client`: 선택, `web` 또는 `mobile`

성공 응답:

```json
{
  "classificationId": "uuid",
  "predictions": [
    { "className": "plastic", "labelKo": "플라스틱", "confidence": 0.7812 },
    { "className": "glass", "labelKo": "유리", "confidence": 0.1431 },
    { "className": "metal", "labelKo": "금속", "confidence": 0.0511 }
  ],
  "needsConfirmation": false,
  "confidenceThreshold": 0.65,
  "model": {
    "name": "mobilenet_v3_small",
    "version": "mobilenetv3-small-gcv2-001",
    "inferenceMode": "model"
  }
}
```

검증 규칙:

- 허용 MIME: `image/jpeg`, `image/png`, `image/webp`
- 최대 파일 크기 기본 8 MiB
- 디코딩 실패 시 422
- 이미지 가로/세로가 너무 작으면 422
- inference timeout 시 503
- `predictions`는 confidence 내림차순, 최대 3개
- confidence는 0~1 범위
- 최고 confidence가 threshold 미만이면 `needsConfirmation: true`

### 7.3 Guide categories

```http
GET /api/v1/guides
GET /api/v1/guides/{category}
GET /api/v1/guides/{category}/{subcategory}
```

가이드 응답은 최소 다음을 포함한다.

```json
{
  "category": "plastic",
  "subcategory": "pet-bottle",
  "title": "투명 페트병",
  "recyclability": "conditional",
  "steps": [
    "내용물을 완전히 비워주세요.",
    "물로 가볍게 헹궈주세요.",
    "라벨을 제거해주세요.",
    "찌그러뜨린 뒤 뚜껑을 닫아 배출해주세요."
  ],
  "warnings": [
    "지역별 세부 배출 기준이 다를 수 있습니다."
  ],
  "sourceNote": "일반적인 분리배출 원칙을 요약한 안내입니다."
}
```

### 7.4 Feedback

```http
POST /api/v1/classifications/{classificationId}/feedback
```

```json
{
  "predictedClass": "glass",
  "selectedClass": "plastic",
  "subcategory": "plastic-container",
  "reason": "user_correction"
}
```

원본 이미지는 기본 저장하지 않는다. 피드백 레코드에는 분류 ID, 예측 클래스, 선택 클래스, confidence, client, 생성 시각만 저장한다.

### 7.5 Statistics

```http
GET /api/v1/statistics/summary
```

```json
{
  "totalClassifications": 126,
  "correctionRate": 0.119,
  "averageTopConfidence": 0.812,
  "categoryCounts": [
    { "className": "plastic", "count": 48 },
    { "className": "paper", "count": 27 }
  ],
  "dataMode": "live"
}
```

실데이터가 없으면 `dataMode: "demo"`를 명시한다.

---

## 8. 도메인 타입 규칙

정규 클래스 이름은 영어 소문자 union으로 고정한다.

```ts
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
```

한국어 라벨은 맵으로 관리한다. API 경계에서 임의 문자열을 허용하지 않는다.

분리배출 가능성:

```ts
export type Recyclability = "yes" | "conditional" | "no" | "special";
```

예측 타입:

```ts
export interface ClassificationPrediction {
  className: GarbageClass;
  labelKo: string;
  confidence: number;
}
```

---

## 9. AI 추론 계약

### 9.1 모델 입력

- RGB 이미지
- EXIF orientation 보정
- 224×224 resize 또는 center crop
- ImageNet normalization
- 단일 배치 추론

### 9.2 모델 출력

- 10개 logit
- softmax 확률
- Top 3
- metadata의 클래스 인덱스 순서를 반드시 사용

### 9.3 모델 artifact

```text
apps/api/models/
├── garbage_classifier.pt
├── metadata.json
└── README.md
```

`metadata.json` 예시:

```json
{
  "modelName": "mobilenet_v3_small",
  "modelVersion": "mobilenetv3-small-gcv2-001",
  "inputSize": [224, 224],
  "classes": [
    "metal",
    "glass",
    "biological",
    "paper",
    "battery",
    "trash",
    "cardboard",
    "shoes",
    "clothes",
    "plastic"
  ],
  "normalization": {
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225]
  },
  "confidenceThreshold": 0.65
}
```

모델 클래스 순서는 코드에 중복 하드코딩하지 않는다. metadata를 source of truth로 사용한다.

### 9.4 Mock mode

환경 변수 `INFERENCE_MODE=mock|model`을 지원한다.

- `model`: 실제 모델 로드
- `mock`: 파일명 hash 또는 deterministic fixture 기반 결과

Mock mode도 API 응답 스키마는 실제 모드와 동일해야 한다. UI가 mock과 model을 구분해 깨지지 않아야 한다.

---

## 10. TypeScript 규칙

- `strict: true`
- `noUncheckedIndexedAccess: true` 권장
- `any` 금지. 불가피할 경우 이유를 주석으로 남긴다.
- 외부 입력은 Zod로 검증한다.
- network response를 타입 단언만으로 신뢰하지 않는다.
- default export는 Next.js page/layout 등 프레임워크 요구 지점에만 사용한다.
- 비동기 함수는 실패 경로를 명시한다.
- 컴포넌트는 가능한 한 표현과 데이터 로직을 분리한다.
- boolean prop은 긍정형 이름을 사용한다.
- 매직 넘버를 상수화한다.
- 날짜는 ISO 8601 UTC로 전송한다.

네이밍:

- 컴포넌트: `PascalCase.tsx`
- hook: `useSomething.ts`
- utility: `camelCase.ts`
- 상수: `UPPER_SNAKE_CASE`
- feature 디렉터리: `kebab-case`

---

## 11. Python 규칙

- Python 3.12
- `ruff`로 lint/format
- `mypy` 또는 pyright 호환 타입 힌트
- Pydantic v2 스타일
- path는 `pathlib.Path`
- 설정은 `pydantic-settings`
- 파일 업로드는 크기 제한과 MIME/디코딩 검증
- 서비스 함수에서 FastAPI `HTTPException`을 남용하지 않는다. 도메인 오류를 정의하고 라우터에서 HTTP 상태로 변환한다.
- 모델 로드는 애플리케이션 lifespan에서 한 번만 수행한다.
- 추론 함수는 side-effect가 없는 형태로 유지한다.
- SQLite 접근은 repository 계층에 둔다.

예상 품질 명령:

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run pytest
```

---

## 12. UI/UX 규칙

### 12.1 공통

- 사용자의 핵심 행동은 한 화면에 하나만 둔다.
- AI 결과를 단정적으로 표현하지 않는다.
- 최고 예측과 confidence를 표시한다.
- 낮은 confidence에서는 직접 선택을 우선 노출한다.
- 모든 AI 결과 화면에 “결과가 다르면 수정” 기능을 제공한다.
- 분리배출 안내는 긴 문단보다 체크리스트를 사용한다.
- “지역별 기준이 다를 수 있음” 고지를 노출한다.

### 12.2 접근성

- 모든 버튼은 명확한 접근성 라벨을 가진다.
- 웹 파일 입력은 키보드로 사용할 수 있어야 한다.
- 색상만으로 상태를 구분하지 않는다.
- 모바일 touch target은 최소 약 44×44pt를 목표로 한다.
- 텍스트 대비를 확보한다.
- 결과 확률은 시각적 막대와 텍스트 수치를 함께 제공한다.

### 12.3 반응형

- 웹 기준 최소 360px 너비에서 레이아웃이 깨지지 않는다.
- 발표용 1440px 화면에서도 콘텐츠가 과도하게 늘어나지 않는다.
- 이미지 업로드 preview는 원본 비율을 유지하고 최대 크기를 제한한다.

---

## 13. 오류 처리

### 13.1 사용자 메시지

메시지는 문제와 다음 행동을 함께 제공한다.

좋은 예:

- “이미지를 읽을 수 없습니다. JPG, PNG 또는 WebP 파일을 다시 선택해주세요.”
- “서버가 응답하지 않습니다. 잠시 후 다시 시도하거나 데모 모드를 사용해주세요.”
- “정확히 판단하기 어렵습니다. 아래 목록에서 직접 종류를 선택해주세요.”

피할 예:

- `Unknown error`
- stack trace 노출
- `500 Internal Server Error`만 표시

### 13.2 API 오류 형식

```json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "이미지를 읽을 수 없습니다.",
    "requestId": "uuid",
    "details": null
  }
}
```

오류 코드는 안정적인 문자열 enum으로 관리한다.

---

## 14. 보안 및 개인정보

- 업로드 이미지는 추론 후 즉시 메모리에서 해제한다.
- 기본 설정에서는 원본 이미지를 디스크에 저장하지 않는다.
- 파일명을 신뢰하지 않는다.
- 이미지 디코더가 실제로 처리할 수 있는지 확인한다.
- 요청 크기 제한을 적용한다.
- CORS origin은 환경 변수로 제한한다.
- 운영 환경에서 wildcard CORS를 사용하지 않는다.
- 사용자에게 모델의 한계와 지역별 규정 차이를 고지한다.
- 로그에 이미지 binary, 토큰, 절대 로컬 경로를 남기지 않는다.
- `.env`는 커밋하지 않는다.

---

## 15. 테스트 기준

### 15.1 API

최소 테스트:

- health 정상 응답
- mock classification Top 3 스키마
- 지원하지 않는 MIME 거부
- 손상 이미지 거부
- 파일 크기 초과 거부
- 존재하지 않는 guide 404
- feedback 생성
- statistics 집계
- 모델 미존재 시 명시적 fallback 또는 startup 실패 정책

### 15.2 Web

최소 테스트:

- 랜딩 핵심 CTA 렌더링
- 이미지 업로드 후 preview
- API 성공 결과 표시
- 낮은 confidence 경고 표시
- API 오류 재시도 UI
- 가이드 검색/필터

### 15.3 Mobile

최소 테스트:

- 권한 거절 상태
- 이미지 선택 후 preview
- 분류 결과 렌더링
- 직접 클래스 수정
- 최근 기록 저장/불러오기
- 네트워크 오류 상태

### 15.4 E2E

시간이 허용하면 웹에 Playwright 시나리오 하나를 둔다.

```text
fixture 이미지 업로드
→ Top 3 표시
→ 클래스 확인
→ 세부 품목 선택
→ 배출 체크리스트 표시
```

---

## 16. 성능 기준

해커톤 데모 환경 목표:

- API health: 300ms 이내
- 이미지 업로드 후 mock 결과: 1초 이내
- CPU 실제 추론: 가능한 한 3초 이내
- 웹 첫 화면에서 불필요한 대형 라이브러리 로드 금지
- 모바일 업로드 전 이미지 긴 변 1280px 수준으로 축소
- 동일 모델을 요청마다 다시 로드하지 않음

성능 수치를 충족하지 못하면 정확히 측정한 결과를 문서화하고, UI에 진행 상태를 제공한다.

---

## 17. 데이터 및 통계 규칙

- 데모 데이터와 실제 데이터는 혼합하지 않는다.
- 통계 응답에 `dataMode: "demo" | "live"`를 포함한다.
- correction rate 분모가 0이면 0 또는 null 정책을 문서화한다.
- confidence 평균은 유효한 classification만 집계한다.
- 사용자가 수정하지 않은 결과와 명시적으로 확인한 결과를 구분할 수 있으면 구분한다.

---

## 18. Git 규칙

- 기존 변경을 덮어쓰지 않는다.
- 위험한 명령(`git reset --hard`, 무차별 `rm -rf`)을 사용하지 않는다.
- 커밋은 하나의 의미 단위로 구성한다.
- 커밋 메시지 예:
  - `feat(api): add image classification endpoint`
  - `feat(mobile): implement camera upload flow`
  - `fix(web): handle low-confidence prediction state`
  - `test(api): cover invalid image uploads`
- generated model, dataset, build output, `.env`, Expo local state는 ignore한다.

---

## 19. 문서 갱신 규칙

다음 변경에는 문서 갱신이 필수다.

- 환경 변수 추가/삭제
- API 스키마 변경
- 실행 명령 변경
- 모델 artifact 위치 또는 형식 변경
- 배포 절차 변경
- 데모 시나리오 변경

루트 README는 “처음 실행하는 사람” 기준으로 유지한다. 상세 설계는 `CODEX.md`, API 계약은 `docs/api.md`, 모델 한계는 `docs/model-card.md`에 둔다.

---

## 20. Definition of Done

기능은 다음 조건을 모두 충족해야 완료로 본다.

1. 요구된 사용자 흐름이 실제로 동작한다.
2. 로딩, 빈 상태, 실패 상태가 존재한다.
3. 웹과 모바일이 동일 API 계약을 사용한다.
4. 타입 또는 스키마 검증이 있다.
5. 관련 테스트가 추가되거나 기존 테스트가 통과한다.
6. lint/typecheck/build에 새 오류가 없다.
7. 시크릿이나 대형 바이너리가 커밋되지 않는다.
8. 문서가 실제 실행 방법과 일치한다.
9. AI 결과에 사용자 확인 또는 수정 경로가 있다.
10. 모델이 없어도 mock mode로 핵심 데모가 가능하다.

---

## 21. 해커톤 우선순위

### P0 — 반드시 완성

- API health
- mock 또는 실제 이미지 분류
- 웹 이미지 업로드와 결과
- 모바일 이미지 촬영/선택과 결과
- 사용자 결과 수정
- 분리배출 가이드
- 핵심 오류 처리
- 발표 가능한 배포 또는 로컬 네트워크 실행

### P1 — 가능하면 완성

- 실제 MobileNetV3 모델 연결
- feedback 저장
- 통계 대시보드
- 최근 기록
- 모델 카드
- 기본 테스트 자동화

### P2 — 시간이 남을 때

- 세부 애니메이션
- ONNX export
- 다국어
- 관리자 분석
- 지도/수거함

P0가 완료되지 않은 상태에서 P2를 시작하지 않는다.

---

## 22. 장애 시 대체 전략

- 모델 학습 실패 → mock inference + 사전 준비된 checkpoint 사용
- API 배포 실패 → 같은 Wi-Fi의 로컬 FastAPI 주소 사용
- 모바일 네이티브 빌드 실패 → Expo Go 시연
- 카메라 권한 문제 → 갤러리 업로드 제공
- 외부 통계 저장 실패 → SQLite 로컬 저장
- 네트워크 불안정 → 웹에 fixture 데모 모드 제공
- 실제 사진 정확도 낮음 → Top 3 + 사용자 확인 흐름을 시연

---

## 23. 에이전트 최종 보고 형식

작업 완료 응답에는 다음을 포함한다.

```text
구현 요약
- ...

변경 파일
- path: 변경 이유

검증
- 명령: 결과

남은 위험 또는 미완료
- ...

실행 방법
- ...
```

완료하지 못한 작업을 완료했다고 표현하지 않는다.
