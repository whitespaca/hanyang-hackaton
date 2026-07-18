# 분리샷

사진 한 장으로 쓰레기 10개 대분류의 AI Top 3를 확인하고, 사용자가 결과를 수정한 뒤 한국형 분리배출 체크리스트를 받는 해커톤용 멀티플랫폼 서비스입니다.

```text
Next.js Web ─┐
             ├─ multipart/JSON ─ FastAPI ─ Predictor(mock/model)
Expo Mobile ─┘                       ├─ Guide JSON
                                    └─ SQLite(익명 요약/피드백)
```

AI 결과는 배출 방법을 자동 확정하지 않습니다. 모든 흐름에 사용자 확인 또는 수정 단계가 있으며, 원본 이미지는 DB나 디스크에 저장하지 않습니다.

## 주요 기능

- 웹: 랜딩, drag-and-drop 업로드, Top 3, 수정, 가이드, 검색, 익명 통계, 모델 한계
- 모바일: 카메라/갤러리, 1280px 압축, 같은 API, 결과 수정, 가이드, 최대 20개 로컬 기록
- API: request ID, 이미지 검증, deterministic mock, 개발 fallback/운영 fail-fast 모델 정책, SQLite
- ML: MobileNetV3 Small 2단계 transfer learning, weighted loss, macro F1/Top-3 평가, metadata export

## 사전 조건

- Node.js 22.13 이상(권장 22 LTS; 현재 Expo 57 최소 버전)
- Corepack과 pnpm 10
- Python 3.12
- uv 권장(없으면 `python -m venv .venv` 후 pip 설치 가능)
- Expo Go 또는 Android/iOS simulator

## 설치

```powershell
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm install
cd apps/api
uv sync
```

uv가 없다면:

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
```

루트 `.env.example`을 참고하고 각 실행 단위의 예제를 복사합니다.

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

## Mock 데모 실행

`apps/api/.env`에 `INFERENCE_MODE=mock`을 설정합니다.

```powershell
# 터미널 1
pnpm dev:api

# 터미널 2
pnpm dev:web

# 터미널 3
pnpm dev:mobile
```

Web은 `http://localhost:3000`, API 문서는 `http://localhost:8000/docs`입니다. 모바일 실제 기기에서 `localhost`는 휴대폰 자신을 뜻합니다. `EXPO_PUBLIC_API_BASE_URL=http://192.168.0.42:8000`처럼 개발 PC의 LAN IP를 사용하고 방화벽에서 8000 포트를 허용하세요.

## 실제 모델 연결

`apps/api/models/garbage_classifier.pt`와 `metadata.json`을 준비한 뒤 `INFERENCE_MODE=model`을 설정합니다. 개발 환경에서 파일 또는 torch가 없으면 health의 `fallbackReason`과 함께 mock으로 전환합니다. `APP_ENV=production`에서는 조용히 전환하지 않고 시작에 실패합니다.

학습은 다음과 같습니다.

```powershell
cd ml
uv sync
uv run python train.py --data-dir C:/absolute/path/to/garbage-classification-v2 --output-dir ../apps/api/models --epochs-head 4 --epochs-finetune 3 --batch-size 32 --seed 42
```

데이터셋 없이 모델 구조와 artifact 계약만 검증할 때는 사전학습 weight를 내려받지 않는 smoke test를 사용합니다.

```powershell
pnpm test:ml
pnpm test:model
```

`test:model`은 임시 MobileNetV3 state dict와 metadata를 생성하고 production model mode의 health·이미지 분류·Top 3까지 확인합니다. 임시 artifact는 저장소에 남기지 않습니다.

## 품질 검사

```powershell
pnpm validate:guides
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:ml
pnpm test:model
pnpm build
pnpm --filter mobile exec expo-doctor
cd apps/api
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run pytest
```

Playwright Chromium이 설치되어 있지 않다면 최초 한 번 다음을 실행합니다.

```powershell
pnpm --filter web exec playwright install chromium
```

## Docker 배포 실행

mock mode로 Web과 API를 함께 실행합니다.

```powershell
docker compose up --build
```

실제 모델 image, 운영 CORS, 공개 API URL 설정은 [배포 문서](docs/deployment.md)를 따릅니다. 모바일 실제 기기 점검은 [기기 QA 체크리스트](docs/device-qa.md)를 사용합니다.

## 데모 시나리오

1. Web `/classify`에서 팀 자체 촬영 골판지 이미지를 업로드합니다.
2. Top 3와 confidence를 설명하고 결과를 확인하거나 수정합니다.
3. 골판지 상자를 선택해 테이프·송장 제거 체크리스트를 표시합니다.
4. Mobile에서 캔을 촬영하고 금속 → 캔 → 배출 완료로 진행합니다.
5. Web `/dashboard`를 새로고침해 익명 분류/수정 통계를 확인합니다.

네트워크 또는 실제 모델 문제가 생기면 API의 mock mode를 사용합니다. mock임을 Web 모델 페이지와 결과에 명시합니다.

## 알려진 제한

- 한 이미지의 대표 물체 하나만 10개 대분류로 분류합니다.
- 실제 학습·평가 결과는 아직 저장소에 포함되지 않았고 모델 지표는 TBD입니다.
- 지자체별 세부 규정, 오염도, 복합재질은 사용자가 별도로 확인해야 합니다.
- 모바일 native 자동 E2E와 앱스토어 배포는 아직 포함하지 않습니다. 실제 기기 수동 QA 체크리스트와 EAS preview profile까지만 제공합니다.

데이터셋 출처: [Garbage Classification V2 on Kaggle](https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2)
