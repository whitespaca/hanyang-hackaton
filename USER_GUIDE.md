# USER_GUIDE.md

# 분리샷 사용자·실행·시연 가이드

## 0. 문서 목적

이 문서는 **분리샷(`garbage-ai`) 프로젝트를 설치하고 실행하며 실제 웹사이트와 React Native 모바일 앱을 사용하는 방법**을 설명한다.

대상 독자는 다음과 같다.

1. Codex를 이용해 프로젝트를 처음 생성하는 개발자
2. 프로젝트를 로컬에서 실행하는 팀원
3. 웹사이트와 모바일 앱을 테스트하는 QA 담당자
4. 해커톤 발표와 시연을 준비하는 발표자
5. 완성된 서비스를 체험하는 일반 사용자

이 문서는 다음 파일과 함께 사용한다.

- `AGENTS.md`: 코딩 에이전트와 개발자가 따라야 할 저장소 작업 규칙
- `CODEX.md`: 제품·기술·API·ML 전체 명세
- `CODEX_PROMPT.md`: Codex가 프로젝트 전체를 구현하도록 지시하는 실행 프롬프트
- `USER_GUIDE.md`: 설치, 실행, 사용, 시연, 문제 해결 방법

> 이 가이드는 `CODEX_PROMPT.md`를 실행해 프로젝트 코드가 생성되었다는 전제를 기본으로 한다. 아직 코드가 생성되지 않았다면 먼저 `CODEX_PROMPT.md`를 Codex에 전달한다.

---

## 1. 서비스 개요

### 1.1 서비스명

- 한글명: **분리샷**
- 코드명: `garbage-ai`
- 형태: 웹사이트 + 모바일 앱 + AI API

### 1.2 서비스가 해결하는 문제

사용자는 쓰레기의 정확한 이름이나 재질을 모를 수 있으며, 같은 대분류 안에서도 품목과 오염 상태에 따라 배출 방법이 달라질 수 있다.

분리샷은 다음 순서로 사용자의 판단을 돕는다.

```text
쓰레기 사진 촬영 또는 업로드
→ AI가 10개 대분류의 Top 3 예측 표시
→ 사용자가 결과 확인 또는 수정
→ 필요한 경우 세부 품목 선택
→ 올바른 분리배출 체크리스트 확인
→ 익명 통계와 피드백 반영
```

### 1.3 지원하는 AI 대분류

| 영문 클래스 | 사용자 표시 | 대표 예시 |
|---|---|---|
| `metal` | 금속 | 음료 캔, 통조림 캔, 금속 조각 |
| `glass` | 유리 | 유리병, 유리 용기 |
| `biological` | 음식물·생물성 | 과일 껍질, 채소 부산물 |
| `paper` | 종이 | 종이, 신문, 종이봉투 |
| `battery` | 배터리 | 건전지, 소형 배터리 |
| `trash` | 일반쓰레기 | 분류가 어려운 혼합 폐기물 |
| `cardboard` | 골판지 | 택배 상자, 포장 상자 |
| `shoes` | 신발 | 운동화, 구두, 슬리퍼 |
| `clothes` | 의류 | 셔츠, 바지, 천 제품 |
| `plastic` | 플라스틱 | 페트병, 플라스틱 용기 |

### 1.4 중요한 한계

분리샷은 다음을 자동으로 확정하지 않는다.

- 여러 물체가 섞인 사진에서 각각의 물체 탐지
- 오염 정도의 정확한 자동 판단
- 플라스틱의 세부 수지 종류 판별
- 지역별 모든 분리배출 조례 자동 적용
- AI 결과만으로 법적·행정적 배출 기준 확정

AI 결과는 **초기 분류 보조 정보**이며, 사용자가 결과를 확인하거나 수정하도록 설계한다.

---

# Part A. 프로젝트 생성 및 로컬 실행

## 2. 저장소 준비

### 2.1 권장 디렉터리

```text
garbage-ai/
├── AGENTS.md
├── CODEX.md
├── CODEX_PROMPT.md
├── USER_GUIDE.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
├── packages/
│   └── shared/
├── data/
├── ml/
└── models/
```

### 2.2 프로젝트 코드가 아직 없는 경우

1. 빈 저장소 루트에 다음 파일을 배치한다.
   - `AGENTS.md`
   - `CODEX.md`
   - `CODEX_PROMPT.md`
   - `USER_GUIDE.md`
2. Codex를 저장소 루트에서 실행한다.
3. `CODEX_PROMPT.md`의 전체 내용을 Codex 작업 지시로 제공한다.
4. Codex가 작업을 마치면 최종 보고에서 다음을 확인한다.
   - 생성된 파일 목록
   - 실행한 테스트
   - 실행하지 못한 테스트
   - 필요한 환경 변수
   - Mock inference 사용 가능 여부
   - 실제 모델 파일 위치
5. 생성된 `README.md`와 이 문서의 명령이 다르면 실제 `package.json` 스크립트를 우선한다.

### 2.3 기존 코드가 있는 경우

아래 명령으로 현재 상태를 먼저 확인한다.

```bash
git status
find . -maxdepth 3 -type f | sort
cat package.json
cat pnpm-workspace.yaml
```

Windows PowerShell에서는 다음처럼 확인할 수 있다.

```powershell
git status
Get-ChildItem -Recurse -Depth 3 -File | Select-Object FullName
Get-Content package.json
Get-Content pnpm-workspace.yaml
```

기존 변경 사항이 있다면 임의로 삭제하거나 초기화하지 않는다.

---

## 3. 사전 요구사항

### 3.1 필수 도구

| 도구 | 권장 기준 | 확인 명령 |
|---|---:|---|
| Git | 최신 안정 버전 | `git --version` |
| Node.js | 22 계열 | `node --version` |
| pnpm | 10 계열 | `pnpm --version` |
| Python | 3.12 계열 | `python --version` |
| uv | 최신 호환 버전 | `uv --version` |
| Expo Go | SDK 호환 버전 | 모바일 앱에서 확인 |

### 3.2 pnpm 설치

Corepack을 사용하는 방식이 권장된다.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

권한 오류가 발생하면 관리자 권한 셸을 사용하거나 Node.js 설치 상태를 확인한다.

### 3.3 uv 설치 확인

```bash
uv --version
```

`uv`가 없다면 프로젝트 팀이 사용하는 공식 설치 방식을 따라 설치한다. `uv`를 사용할 수 없는 환경에서는 `python -m venv`와 `pip`로 대체할 수 있으나, 잠금 파일과 실제 의존성 정의를 확인해야 한다.

### 3.4 모바일 개발 준비

실제 기기 사용 시 다음 조건을 확인한다.

- 개발 PC와 스마트폰이 같은 Wi-Fi 또는 같은 LAN에 연결되어 있다.
- 스마트폰에 Expo Go가 설치되어 있다.
- 방화벽이 FastAPI 포트를 차단하지 않는다.
- API가 `127.0.0.1`이 아니라 `0.0.0.0`에 바인딩된다.
- 모바일 앱 환경 변수에는 PC의 LAN IP를 사용한다.

예:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.15:8000
```

모바일 기기에서 `localhost`는 개발 PC가 아니라 **모바일 기기 자체**를 의미한다.

---

## 4. 의존성 설치

### 4.1 JavaScript/TypeScript 의존성

저장소 루트에서 실행한다.

```bash
pnpm install
```

완료 후 다음 디렉터리 또는 잠금 파일이 존재하는지 확인한다.

```text
node_modules/
pnpm-lock.yaml
```

### 4.2 Python API 의존성

```bash
cd apps/api
uv sync
cd ../..
```

프로젝트가 ML 학습 의존성을 별도 그룹으로 정의했다면 다음과 같은 명령이 필요할 수 있다.

```bash
cd apps/api
uv sync --all-groups
```

정확한 그룹명은 `apps/api/pyproject.toml`을 확인한다.

### 4.3 설치 검증

```bash
pnpm --version
node --version
cd apps/api && uv run python --version && cd ../..
```

---

## 5. 환경 변수 설정

### 5.1 루트 환경 변수

먼저 예제 파일을 확인한다.

```bash
cat .env.example
```

프로젝트 구조에 따라 각 앱의 `.env.example`을 복사한다.

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env
```

Windows PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
Copy-Item apps/api/.env.example apps/api/.env
```

실제 파일 경로가 다르면 생성된 README와 각 앱의 설정 파일을 우선한다.

### 5.2 웹 환경 변수

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

웹사이트와 API를 같은 PC에서 실행한다면 `localhost`를 사용할 수 있다.

### 5.3 모바일 환경 변수

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.15:8000
```

`192.168.0.15`는 예시다. 실제 PC LAN IP를 사용한다.

LAN IP 확인 예시:

macOS/Linux:

```bash
ip addr
# 또는
ifconfig
```

Windows:

```powershell
ipconfig
```

### 5.4 API 환경 변수

Mock 모드 예시:

```dotenv
INFERENCE_MODE=mock
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
DATABASE_URL=sqlite:///./data/garbage_ai.db
MAX_UPLOAD_BYTES=8388608
CONFIDENCE_THRESHOLD=0.65
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

실제 모델 모드 예시:

```dotenv
INFERENCE_MODE=model
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
DATABASE_URL=sqlite:///./data/garbage_ai.db
MAX_UPLOAD_BYTES=8388608
CONFIDENCE_THRESHOLD=0.65
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 5.5 환경 변수 보안

다음 파일은 Git에 커밋하지 않는다.

- `.env`
- `.env.local`
- API 키 또는 토큰이 포함된 파일
- Kaggle 인증 파일
- 모델 학습 중 생성된 개인 경로 설정

커밋 전 확인:

```bash
git status --short
```

---

## 6. 가장 빠른 실행: Mock inference 모드

실제 모델 학습이 끝나지 않았거나 발표 안정성이 우선이라면 Mock 모드부터 사용한다.

### 6.1 Mock 모드 설정

`apps/api/.env`:

```dotenv
INFERENCE_MODE=mock
```

### 6.2 API 실행

터미널 1:

```bash
cd apps/api
uv run fastapi dev app/main.py --host 0.0.0.0
```

FastAPI CLI 스크립트가 없는 경우 프로젝트에서 정의한 대체 명령을 사용한다.

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6.3 API 상태 확인

브라우저 또는 curl로 확인한다.

```bash
curl http://localhost:8000/health
```

예상 응답 형태:

```json
{
  "status": "ok",
  "inferenceMode": "mock",
  "modelLoaded": false
}
```

실제 응답 필드명은 구현된 OpenAPI 문서를 기준으로 한다.

API 문서 후보 주소:

```text
http://localhost:8000/docs
http://localhost:8000/redoc
```

### 6.4 웹 실행

터미널 2, 저장소 루트:

```bash
pnpm dev:web
```

스크립트가 다르면 다음으로 확인한다.

```bash
cat package.json
pnpm --filter web dev
```

기본 접속 주소 후보:

```text
http://localhost:3000
```

### 6.5 모바일 실행

터미널 3, 저장소 루트:

```bash
pnpm dev:mobile
```

또는:

```bash
pnpm --filter mobile start
```

Expo 개발 서버에서 QR 코드를 확인한 뒤 Expo Go로 스캔한다.

### 6.6 Mock 모드 확인 사항

- 동일 fixture 이미지는 매번 동일한 결과를 반환한다.
- Top 3 예측이 항상 confidence 내림차순으로 표시된다.
- low confidence fixture가 별도로 존재한다.
- 사용자 수정 기능이 정상 동작한다.
- 피드백 제출 후 통계가 갱신된다.
- 화면에 Mock 또는 Demo 모드임을 표시한다.

---

## 7. 실제 AI 모델 실행

### 7.1 데이터셋 준비

기본 데이터셋은 Kaggle의 Garbage Classification V2다.

데이터셋을 다운로드한 후 원본 데이터는 저장소에 커밋하지 않는다.

권장 예시 경로:

```text
local-data/
└── garbage-classification-v2/
    ├── metal/
    ├── glass/
    ├── biological/
    ├── paper/
    ├── battery/
    ├── trash/
    ├── cardboard/
    ├── shoes/
    ├── clothes/
    └── plastic/
```

실제 폴더 구조가 train/validation/test로 분리되어 있을 수 있으므로 학습 스크립트의 인자를 확인한다.

### 7.2 데이터 검증

학습 전에 반드시 다음을 확인한다.

- 클래스 폴더명
- 클래스별 이미지 수
- 손상 이미지 수
- 지원하지 않는 확장자
- 중복 또는 비정상 이미지
- 학습·검증·테스트 split 구조

프로젝트가 검증 스크립트를 제공한다면 예시는 다음과 같다.

```bash
uv run python ml/validate_dataset.py \
  --data-dir ./local-data/garbage-classification-v2
```

실제 스크립트와 옵션은 `ml/README.md`, `--help`, 또는 소스 코드를 확인한다.

```bash
uv run python ml/validate_dataset.py --help
```

### 7.3 모델 학습

예시:

```bash
uv run python ml/train.py \
  --data-dir ./local-data/garbage-classification-v2 \
  --output-dir ./artifacts/training-run-001 \
  --model mobilenet_v3_small \
  --epochs 8 \
  --batch-size 32
```

GPU가 없거나 시간이 부족하면 다음을 우선한다.

- 입력 크기 224 × 224
- MobileNetV3 Small
- 분류 헤드 우선 학습
- 낮은 epoch 수로 파이프라인 검증
- 학습 완료 후 마지막 블록 일부만 미세조정

### 7.4 모델 평가

예시:

```bash
uv run python ml/evaluate.py \
  --checkpoint ./artifacts/training-run-001/best.pt \
  --data-dir ./local-data/garbage-classification-v2
```

최소 확인 지표:

- Test Accuracy
- Macro F1
- Top-3 Accuracy
- 클래스별 Precision/Recall/F1
- Confusion Matrix

정확도 하나만으로 모델을 평가하지 않는다.

### 7.5 런타임 모델 export

예시:

```bash
uv run python ml/export.py \
  --checkpoint ./artifacts/training-run-001/best.pt \
  --output ./apps/api/models/garbage_classifier.pt \
  --metadata-output ./apps/api/models/metadata.json
```

필수 산출물 예시:

```text
apps/api/models/
├── garbage_classifier.pt
└── metadata.json
```

`metadata.json`에는 다음 정보가 포함되어야 한다.

- 클래스 순서
- 입력 크기
- 정규화 mean/std
- 모델 아키텍처
- 학습 데이터셋 식별 정보
- 모델 버전
- 성능 지표
- 생성 시각

### 7.6 Model 모드로 전환

`apps/api/.env`:

```dotenv
INFERENCE_MODE=model
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
```

API를 재시작한 후 health endpoint에서 모델 로드 상태를 확인한다.

```bash
curl http://localhost:8000/health
```

모델 로드에 실패하면 API가 조용히 잘못된 결과를 반환해서는 안 된다. 명확한 오류를 표시하거나 Mock fallback 정책에 따라 동작해야 한다.

---

# Part B. 일반 사용자 사용법

## 8. 웹사이트 사용법

### 8.1 웹사이트 접속

로컬 개발 환경:

```text
http://localhost:3000
```

배포 환경에서는 팀이 제공한 공개 URL을 사용한다.

### 8.2 메인 페이지

메인 페이지에서는 다음을 확인할 수 있다.

- 서비스가 해결하는 문제
- 사진 기반 분류 동작 방식
- 웹 분류 체험 이동 버튼
- 분리배출 가이드 이동 버튼
- 모바일 앱 소개
- AI의 한계와 사용자 확인 원칙

### 8.3 웹에서 이미지 분류하기

1. `AI 분류 체험` 또는 `사진으로 분류하기` 버튼을 누른다.
2. 업로드 영역을 누르거나 이미지 파일을 드래그한다.
3. 쓰레기 하나가 중앙에 크게 나온 이미지를 선택한다.
4. 이미지 미리보기를 확인한다.
5. `분석하기` 버튼을 누른다.
6. 업로드와 분석이 끝날 때까지 로딩 상태를 확인한다.
7. Top 3 결과와 confidence를 확인한다.
8. 가장 적절한 결과를 선택한다.
9. AI 결과가 틀리면 `다른 결과 선택` 또는 수정 기능을 사용한다.
10. 세부 품목을 선택한다.
11. 분리배출 체크리스트를 확인한다.

### 8.4 좋은 사진 촬영·선택 방법

정확도를 높이기 위해 다음 조건을 지킨다.

- 한 장에 쓰레기 하나만 보이게 한다.
- 물체가 프레임의 중앙과 대부분을 차지하게 한다.
- 너무 어둡거나 역광인 사진을 피한다.
- 흔들리거나 초점이 맞지 않은 사진을 피한다.
- 손이나 다른 물체가 대상의 대부분을 가리지 않게 한다.
- 복잡한 배경보다 단순한 배경을 사용한다.
- 여러 쓰레기가 한 봉투에 섞인 사진은 사용하지 않는다.

### 8.5 결과 화면 이해하기

예:

```text
1. 플라스틱 72%
2. 유리 17%
3. 금속 6%
```

의미:

- `72%`는 모델이 플라스틱 클래스를 가장 가능성 높은 후보로 판단했다는 뜻이다.
- 실제 재활용 가능성을 72%로 보장한다는 뜻은 아니다.
- confidence가 낮으면 사용자가 직접 올바른 클래스를 선택해야 한다.

### 8.6 낮은 신뢰도 안내

모델의 최고 confidence가 기준값보다 낮으면 다음과 유사한 메시지가 표시된다.

```text
정확히 판단하기 어렵습니다.
아래 후보 중 실제 물건과 가장 가까운 종류를 선택해 주세요.
```

이 경우:

1. 사진을 더 밝고 가까이 다시 촬영한다.
2. Top 3 중 올바른 후보가 있으면 선택한다.
3. 후보에 없으면 전체 클래스 목록에서 직접 선택한다.
4. 알 수 없다면 일반 검색 또는 지역 배출 기준을 확인한다.

### 8.7 세부 품목 선택

대분류만으로 정확한 배출 안내를 제공하기 어려운 경우 세부 질문이 표시된다.

예: 플라스틱

- 투명 페트병
- 플라스틱 용기
- 비닐
- 스티로폼
- 잘 모르겠어요

예: 유리

- 음료·식품 유리병
- 깨진 유리
- 내열유리·거울·도자기

예: 음식물·생물성

- 일반 음식물
- 뼈·조개껍데기
- 티백·한약재
- 과일·채소

### 8.8 분리배출 체크리스트

체크리스트는 일반적으로 다음 행동을 안내한다.

- 내용물 비우기
- 오염 제거 또는 헹구기
- 라벨과 다른 재질 분리
- 압착 또는 묶기
- 지정된 수거함에 배출
- 지역별 별도 기준 확인

체크 상태는 사용자의 행동 보조 기능이다. 행정기관의 공식 배출 신고를 의미하지 않는다.

### 8.9 가이드 검색

1. 상단 메뉴에서 `분리배출 가이드`를 선택한다.
2. 품목명 또는 재질을 검색한다.
3. 검색 결과에서 가까운 항목을 선택한다.
4. 배출 전 처리, 배출 위치, 주의사항을 확인한다.
5. 지역별 규정이 다를 수 있다는 안내가 있으면 해당 지자체 기준을 확인한다.

### 8.10 통계 대시보드

대시보드에는 다음과 같은 익명 집계가 표시될 수 있다.

- 전체 분류 요청 수
- 카테고리별 요청 비율
- 평균 confidence
- 사용자 수정률
- 웹·모바일 요청 비중
- 최근 분류 추세

`Demo`, `Mock`, `Sample`로 표시된 통계는 실제 운영 데이터가 아닐 수 있다.

---

## 9. React Native 모바일 앱 사용법

### 9.1 앱 실행

개발 시연 환경에서는 다음 중 하나를 사용한다.

1. Expo Go QR 스캔
2. Android 에뮬레이터
3. iOS 시뮬레이터
4. EAS Preview Build
5. 해커톤용 APK

### 9.2 첫 실행 권한

앱은 다음 권한을 요청할 수 있다.

- 카메라 권한
- 사진 라이브러리 접근 권한

권한을 거절하면:

- 카메라 촬영 기능을 사용할 수 없다.
- 갤러리 선택은 별도 권한 상태에 따라 사용할 수 있다.
- 앱 설정에서 나중에 권한을 변경할 수 있다.

앱은 권한을 강제로 요구하지 않고 거절 상태와 해결 방법을 표시해야 한다.

### 9.3 카메라로 분류하기

1. 홈 화면에서 `사진 촬영하기`를 누른다.
2. 카메라 권한을 허용한다.
3. 쓰레기 하나를 촬영 가이드 영역 중앙에 놓는다.
4. 흔들림 없이 촬영한다.
5. 미리보기에서 사진을 확인한다.
6. 문제가 있으면 `다시 촬영`을 누른다.
7. 적절하면 `이 사진 사용`을 누른다.
8. 이미지가 API로 업로드되고 결과가 표시된다.
9. Top 3 결과를 확인한다.
10. 올바른 분류를 선택하고 배출 가이드를 확인한다.

### 9.4 갤러리 이미지로 분류하기

1. 홈에서 `갤러리에서 선택`을 누른다.
2. 사진 권한을 허용한다.
3. 쓰레기 한 개가 잘 보이는 사진을 선택한다.
4. 미리보기를 확인한다.
5. `분석하기`를 누른다.

### 9.5 결과 수정하기

AI 결과가 틀렸다면:

1. `다른 결과 선택`을 누른다.
2. 전체 클래스 중 올바른 클래스를 선택한다.
3. 필요하면 세부 품목을 선택한다.
4. 수정된 결과로 가이드를 확인한다.

수정 결과는 모델 개선을 위한 익명 피드백 통계로 저장될 수 있다. 원본 이미지는 장기 저장하지 않는 것이 기본 정책이다.

### 9.6 최근 기록

모바일 앱은 최근 분류 기록을 기기 내부에 저장할 수 있다.

기록 예시:

- 분류 시각
- 사용자가 확정한 카테고리
- 세부 품목
- 최고 confidence
- Mock 또는 Model 모드 여부

원본 사진을 기록에 영구 저장하지 않는 것이 기본이다.

### 9.7 최근 기록 삭제

앱에서 삭제 기능을 제공한다면:

1. `최근 기록` 화면으로 이동한다.
2. 개별 항목의 삭제 메뉴 또는 전체 삭제 버튼을 누른다.
3. 삭제 확인 대화상자에서 승인한다.

기능이 구현되지 않은 MVP에서는 앱 데이터 초기화 또는 재설치로 로컬 기록이 삭제될 수 있다.

---

# Part C. 발표 및 시연 가이드

## 10. 해커톤 발표 전 준비

### 10.1 필수 준비물

- 개발 PC와 충전기
- 시연용 스마트폰과 충전 케이블
- 동일 Wi-Fi 또는 휴대용 라우터
- 시연용 쓰레기 2~3개
- 웹용 fixture 이미지
- Mock inference 모드 백업
- API와 웹의 배포 URL
- QR 코드 또는 Expo 링크
- 시연 화면 녹화 영상
- 발표 자료

### 10.2 추천 시연 물체

인식이 비교적 명확하고 분리배출 행동을 설명하기 좋은 물체를 사용한다.

- 깨끗한 음료 캔
- 펼치지 않은 골판지 상자 조각
- 투명 플라스틱 용기
- 일반 건전지

다음은 주 시연 물체로 피하는 편이 안전하다.

- 여러 재질이 섞인 복합 제품
- 심하게 찌그러진 물체
- 라벨이 대부분을 가린 물체
- 배경과 색이 비슷한 투명 물체
- 매우 작거나 반사가 심한 물체

### 10.3 발표 직전 체크

```text
[ ] API health 정상
[ ] 웹에서 API 호출 성공
[ ] 스마트폰에서 API 접속 성공
[ ] 카메라 권한 허용
[ ] 갤러리 권한 허용
[ ] Mock 모드 백업 준비
[ ] fixture 이미지 로컬 저장
[ ] 통계 Demo/Live 표기 확인
[ ] 방화벽 확인
[ ] 모바일 화면 자동 잠금 해제 또는 시간 연장
[ ] 모든 기기 충전 상태 확인
[ ] 발표 브라우저 탭 미리 열기
```

### 10.4 기본 발표 시나리오

1. 웹 랜딩에서 문제를 한 문장으로 설명한다.
2. 웹에서 골판지 fixture 이미지를 업로드한다.
3. Top 3와 confidence를 보여준다.
4. `골판지`를 사용자가 확인한다.
5. 테이프와 송장을 제거하는 체크리스트를 보여준다.
6. React Native 앱으로 실제 캔을 촬영한다.
7. `금속` 예측과 confidence를 보여준다.
8. 사용자가 `캔` 세부 품목을 선택한다.
9. 내용물 비우기와 헹구기 안내를 보여준다.
10. 웹 대시보드를 새로고침한다.
11. 분류 요청 수 또는 금속 카테고리 수가 반영된 것을 보여준다.

### 10.5 AI 실패를 활용하는 시나리오

AI가 애매한 결과를 내는 것은 반드시 실패로만 설명할 필요가 없다.

1. 투명 플라스틱 컵을 촬영한다.
2. `플라스틱 57%`, `유리 32%`처럼 낮은 confidence를 보여준다.
3. 앱이 확정하지 않고 사용자 확인을 요청하는 것을 보여준다.
4. 사용자가 `플라스틱`으로 수정한다.
5. 세부 품목을 선택한다.
6. 최종 배출 방법을 확인한다.

발표 메시지:

> 분리샷은 AI가 사용자의 판단을 대체하도록 설계하지 않았습니다. AI가 빠르게 후보를 좁히고, 사용자가 확인해 실제 행동으로 이어지도록 설계했습니다.

### 10.6 네트워크 실패 백업

네트워크가 불안정하면 다음 순서로 전환한다.

1. 공개 API 대신 같은 LAN의 로컬 API 사용
2. Model 모드 대신 Mock 모드 사용
3. 실시간 모바일 촬영 대신 갤러리 fixture 사용
4. 실제 API 호출 대신 미리 녹화한 시연 영상 사용
5. 마지막 수단으로 화면 캡처와 데이터 흐름 설명 사용

백업을 사용할 때는 실제 모델 결과처럼 오해시키지 말고 Demo/Mock임을 명확히 표시한다.

---

# Part D. 테스트와 검증

## 11. 전체 검증 명령

실제 스크립트 존재 여부는 루트 `package.json`과 각 패키지의 `package.json`을 확인한다.

### 11.1 프런트엔드 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### 11.2 API 검증

```bash
cd apps/api
uv run pytest
uv run ruff check .
uv run mypy app
cd ../..
```

프로젝트에서 Ruff나 mypy를 사용하지 않으면 정의된 도구만 실행한다.

### 11.3 Expo 검증

```bash
pnpm --filter mobile exec expo-doctor
```

또는 모바일 디렉터리에서:

```bash
cd apps/mobile
npx expo-doctor
cd ../..
```

### 11.4 특정 앱만 실행

웹:

```bash
pnpm --filter web dev
```

모바일:

```bash
pnpm --filter mobile start
```

API:

```bash
cd apps/api
uv run fastapi dev app/main.py --host 0.0.0.0
```

---

## 12. 수동 QA

### 12.1 웹 QA

- 360px 너비에서 레이아웃이 깨지지 않는가
- 1440px 발표 화면에서 콘텐츠가 과도하게 넓어지지 않는가
- 키보드만으로 파일 선택 버튼에 접근 가능한가
- 이미지가 없는 상태에서 분석 버튼이 비활성화되는가
- 허용하지 않는 파일 형식이 거부되는가
- 8 MiB 초과 파일이 거부되는가
- 손상 이미지가 사용자 친화적 오류로 처리되는가
- API가 꺼졌을 때 재시도 안내가 표시되는가
- low confidence 상태가 명확히 표시되는가
- 사용자가 AI 결과를 수정할 수 있는가
- 검색 결과가 없을 때 빈 상태가 표시되는가
- Demo/Live 통계가 구분되는가

### 12.2 모바일 QA

- 카메라 권한 허용 상태
- 카메라 권한 거절 상태
- 갤러리 권한 허용과 거절
- 실제 기기에서 API 접속
- 세로 화면에서 모든 버튼 노출
- 네트워크 단절 시 오류 표시
- 재시도 버튼 동작
- 최근 기록 유지
- 긴 한국어 문구 잘림 여부
- Android 뒤로 가기 동작
- iOS Safe Area 처리
- 촬영 후 이미지 회전 방향 정상 여부

### 12.3 API QA

- `/health` 정상 응답
- Mock 모드 시작
- Model 모드 시작
- 모델 파일 누락 처리
- 잘못된 MIME 거부
- 손상 이미지 디코딩 거부
- 파일 크기 제한
- CORS 허용·차단
- request ID 응답
- SQLite 자동 생성
- feedback 저장
- statistics 집계

---

# Part E. 문제 해결

## 13. 자주 발생하는 문제

### 13.1 `pnpm: command not found`

원인:

- pnpm 미설치
- Corepack 비활성화
- PATH 미적용

해결:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

터미널을 다시 시작한 후 재확인한다.

### 13.2 `uv: command not found`

원인:

- uv 미설치
- PATH 미적용

해결:

- 프로젝트 팀 표준 방식으로 uv를 설치한다.
- 설치 후 터미널을 재시작한다.
- 임시 대체로 Python virtual environment를 사용할 수 있으나 잠금 파일과 의존성 정의를 맞춰야 한다.

### 13.3 웹에서 API 연결 실패

확인 순서:

1. API 터미널에 오류가 없는지 확인
2. `http://localhost:8000/health` 확인
3. `NEXT_PUBLIC_API_BASE_URL` 확인
4. 브라우저 개발자 도구 Network 확인
5. API CORS 설정 확인
6. 환경 변수 변경 후 웹 개발 서버 재시작

### 13.4 모바일에서 `Network request failed`

가장 흔한 원인은 모바일 앱에서 `localhost`를 사용한 경우다.

해결:

1. PC의 LAN IP를 확인한다.
2. 모바일 환경 변수를 수정한다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.15:8000
```

3. API를 `0.0.0.0`에 바인딩한다.
4. 스마트폰과 PC를 같은 네트워크에 연결한다.
5. OS 방화벽에서 8000 포트를 허용한다.
6. Expo 개발 서버를 재시작한다.

### 13.5 Expo QR 코드로 접속되지 않음

확인:

- Expo Go와 프로젝트 SDK 호환 여부
- PC와 스마트폰 네트워크 동일 여부
- VPN 또는 기업 네트워크 차단 여부
- Expo의 LAN/Tunnel 모드

대응:

- LAN 대신 Tunnel 모드 사용
- 휴대폰 핫스팟으로 PC와 기기 연결
- Android 에뮬레이터 사용
- EAS preview build 사용

### 13.6 카메라 권한을 잘못 거절함

Android:

- 설정 → 앱 → Expo Go 또는 분리샷 → 권한 → 카메라 허용

- 메뉴 이름은 기기 제조사와 OS 버전에 따라 다를 수 있다.

아이폰:

- 설정 → 개인정보 보호 및 보안 → 카메라 → Expo Go 또는 분리샷 허용

### 13.7 CORS 오류

브라우저 콘솔에 CORS 관련 오류가 보이면 API 환경 변수의 허용 origin을 확인한다.

```dotenv
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

배포 URL을 사용하는 경우 정확한 origin을 추가한다.

```dotenv
CORS_ORIGINS=https://example-web.vercel.app
```

프로덕션에서 `*` 전체 허용을 기본값으로 사용하지 않는다.

### 13.8 모델 파일을 찾지 못함

확인:

```bash
ls -la apps/api/models
cat apps/api/.env
```

확인 항목:

- `MODEL_PATH`가 API 실행 디렉터리 기준인지
- 파일명이 정확한지
- 대소문자가 일치하는지
- `metadata.json`이 존재하는지
- 모델 클래스 순서가 metadata와 일치하는지

긴급 시연에서는:

```dotenv
INFERENCE_MODE=mock
```

으로 전환한다.

### 13.9 이미지가 항상 같은 클래스로 분류됨

가능한 원인:

- 전처리 mean/std 불일치
- RGB 변환 누락
- 클래스 인덱스 순서 불일치
- 학습 checkpoint 로드 실패
- Softmax 축 오류
- Mock 모드가 켜져 있음

확인:

1. health endpoint의 inference mode
2. metadata 클래스 순서
3. export 스크립트와 API 전처리 코드
4. fixture 테스트 결과
5. raw logits와 softmax 값

### 13.10 confidence 합이 100%가 아님

Top 3만 표시하면 나머지 7개 클래스의 확률이 생략되므로 Top 3 합이 100%보다 작을 수 있다. 이는 정상이다.

### 13.11 통계가 갱신되지 않음

확인:

- 분류 완료 후 feedback endpoint가 호출되는지
- 사용자가 최종 결과를 확정했는지
- SQLite 파일 경로와 쓰기 권한
- 웹 대시보드 캐시 또는 재검증 설정
- Demo/Live 필터 상태

### 13.12 SQLite `database is locked`

해커톤 MVP에서는 단일 API 프로세스를 우선한다.

대응:

- 여러 worker를 1개로 줄인다.
- 장시간 transaction이 있는지 확인한다.
- connection 종료가 보장되는지 확인한다.
- API 프로세스를 재시작한다.

### 13.13 포트가 이미 사용 중임

포트 확인:

macOS/Linux:

```bash
lsof -i :8000
lsof -i :3000
```

Windows:

```powershell
netstat -ano | findstr :8000
netstat -ano | findstr :3000
```

다른 포트를 사용한다면 웹과 모바일의 API URL도 함께 수정한다.

### 13.14 환경 변수를 수정했는데 반영되지 않음

대부분의 프런트엔드 환경 변수는 개발 서버 시작 시 읽는다.

해결:

1. 웹/Expo 개발 서버 종료
2. 캐시가 의심되면 정리
3. 서버 재시작
4. 앱 새로고침 또는 재설치

Expo 캐시 초기화 예시:

```bash
cd apps/mobile
npx expo start --clear
```

---

# Part F. 운영과 개인정보

## 14. 개인정보와 이미지 처리

기본 원칙:

- 원본 이미지는 추론에 필요한 시간 동안만 메모리에서 처리한다.
- 원본 이미지를 장기 저장하지 않는다.
- 개인 식별 정보를 수집하지 않는다.
- 파일명만으로 사용자를 식별하지 않는다.
- 통계는 카테고리와 confidence 등 최소 정보만 익명 집계한다.
- 업로드 이미지에 얼굴, 문서, 주소 등이 포함될 수 있으므로 촬영 안내에서 배경을 최소화한다.

실제 배포 전 개인정보 처리방침과 데이터 보존 정책을 별도로 마련해야 한다.

## 15. 분리배출 안내 면책

분리배출 기준은 지자체, 공동주택, 수거업체, 품목 상태에 따라 달라질 수 있다.

서비스 안내에는 다음 취지의 문구가 포함되어야 한다.

```text
이 안내는 일반적인 분리배출 원칙을 제공합니다.
지역별 기준과 품목 상태에 따라 배출 방법이 다를 수 있으므로,
최종 배출 전 관할 지자체 또는 시설의 안내를 확인해 주세요.
```

## 16. 운영자 일일 점검

```text
[ ] API health 정상
[ ] 모델 로드 상태 정상
[ ] 웹 분류 요청 정상
[ ] 모바일 분류 요청 정상
[ ] 오류율 급증 여부
[ ] 데이터베이스 쓰기 가능
[ ] 디스크 용량
[ ] 모델 버전과 metadata 일치
[ ] Demo/Live 표시 정확
[ ] CORS origin 최소 허용
[ ] 비밀값 저장소 노출 없음
```

---

# Part G. 빠른 참조

## 17. 실행 명령 요약

### 설치

```bash
pnpm install
cd apps/api && uv sync && cd ../..
```

### API

```bash
cd apps/api
uv run fastapi dev app/main.py --host 0.0.0.0
```

### 웹

```bash
pnpm dev:web
```

### 모바일

```bash
pnpm dev:mobile
```

### 테스트

```bash
pnpm lint
pnpm typecheck
pnpm test
cd apps/api && uv run pytest && cd ../..
```

### Mock 모드

```dotenv
INFERENCE_MODE=mock
```

### 실제 모델 모드

```dotenv
INFERENCE_MODE=model
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
```

---

## 18. 5분 내 빠른 시작

프로젝트 코드와 의존성이 이미 준비된 경우:

1. API Mock 모드를 설정한다.

```dotenv
INFERENCE_MODE=mock
```

2. 터미널 1에서 API를 실행한다.

```bash
cd apps/api
uv run fastapi dev app/main.py --host 0.0.0.0
```

3. 터미널 2에서 웹을 실행한다.

```bash
pnpm dev:web
```

4. 웹에서 접속한다.

```text
http://localhost:3000
```

5. 터미널 3에서 모바일을 실행한다.

```bash
pnpm dev:mobile
```

6. Expo Go로 QR 코드를 스캔한다.
7. 웹 fixture 업로드와 모바일 촬영을 각각 한 번 테스트한다.

---

## 19. 완료 확인 체크리스트

### 설치

- [ ] Node.js 버전 확인
- [ ] pnpm 설치
- [ ] Python 버전 확인
- [ ] uv 설치
- [ ] JavaScript 의존성 설치
- [ ] Python 의존성 설치
- [ ] 환경 변수 작성

### API

- [ ] `/health` 성공
- [ ] Mock 모드 성공
- [ ] Model 모드 성공 또는 명시적 미지원 처리
- [ ] 이미지 업로드 성공
- [ ] 오류 응답 정상
- [ ] 피드백 저장
- [ ] 통계 조회

### 웹

- [ ] 랜딩 접속
- [ ] 이미지 선택
- [ ] 분석 결과
- [ ] Top 3
- [ ] 결과 수정
- [ ] 세부 품목
- [ ] 가이드
- [ ] 대시보드

### 모바일

- [ ] Expo 실행
- [ ] 카메라 권한
- [ ] 촬영
- [ ] 갤러리 선택
- [ ] API 연결
- [ ] 결과 수정
- [ ] 가이드
- [ ] 최근 기록

### 발표

- [ ] 시연 물체 준비
- [ ] fixture 이미지 준비
- [ ] Mock 백업
- [ ] 화면 녹화 백업
- [ ] LAN IP 확인
- [ ] 방화벽 확인
- [ ] 통계 Demo/Live 확인
- [ ] 발표 흐름 리허설

---

## 20. 문서 우선순위

문서나 실제 코드가 충돌할 경우 다음 우선순위를 따른다.

1. 사용자의 현재 명시적 지시
2. 실제 동작하는 저장소 코드와 설정
3. `AGENTS.md`
4. `CODEX.md`
5. 생성된 `README.md`
6. `USER_GUIDE.md`

단, 코드가 명세를 위반하고 있다면 단순히 코드를 우선하지 말고 문제를 기록하고 수정한다.

---

## 21. 최종 사용자 핵심 안내

```text
1. 쓰레기 하나만 선명하게 촬영하세요.
2. AI의 Top 3 결과와 신뢰도를 확인하세요.
3. AI가 틀렸다면 직접 올바른 종류를 선택하세요.
4. 세부 품목과 오염 상태를 확인하세요.
5. 체크리스트에 따라 내용물과 이물질을 제거하세요.
6. 지역별 배출 기준이 다를 수 있으므로 최종 안내를 확인하세요.
```

분리샷의 핵심은 AI가 정답을 단정하는 것이 아니라, 사용자가 **더 빠르고 더 안전하게 올바른 배출 행동을 선택하도록 돕는 것**이다.
