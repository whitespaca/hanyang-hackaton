# 분리샷

사진 한 장으로 10개 쓰레기 대분류의 AI Top 3를 확인하고, 사용자가 결과를 확인·수정한 뒤 한국형 분리배출 체크리스트를 받는 멀티플랫폼 서비스입니다.

```text
Next.js Web ─┐
             ├─ shared Zod/API client ─ FastAPI ─ Predictor(mock/model)
Expo Mobile ─┘                              ├─ Guide JSON
                                           └─ SQLite(익명 분류·피드백)
```

AI 결과는 배출 방법을 자동 확정하지 않습니다. 모든 흐름에 사용자 확인 또는 수정 단계가 있으며 업로드 원본은 DB·디스크·최근 기록에 저장하지 않습니다.

## 현재 상태

- P0 mock 데모: 동작
- 실제 모델: **PARTIAL — CODE READY, TRAINING NOT RUN** (현재 checkout에 Kaggle dataset과 실제 artifact 없음)
- Playwright: 실제 FastAPI mock 서버를 사용하는 8개 분류 E2E
- 기기 QA: **AUTOMATION READY, MANUAL DEVICE QA REQUIRED**
- 배포: **DEPLOYMENT READY, NOT DEPLOYED**
- ONNX: 임시 artifact export/parity smoke 통과, 실제 모델 benchmark 전환 결정은 보류

자세한 증거는 [상태 감사](docs/status-audit.md), [모델 평가](docs/model-evaluation.md), [기기 QA](docs/device-qa.md), [ONNX 검토](docs/onnx-evaluation.md)를 확인하세요.

## 주요 기능

- Web: 반응형 랜딩, drag-and-drop 업로드, Top 3/confidence, 저신뢰도·오류·재시도, 사용자 수정, 가이드, 통계, 모델 설명
- Mobile: 카메라/갤러리, 긴 변 1280px JPEG 압축, LAN API 진단, 결과 수정, 가이드, 최대 20개 로컬 기록
- API: request ID, JPEG/PNG/WebP와 8 MiB 검증, Pillow decode·decompression bomb 방어, mock/model 정책, SQLite, exact-origin CORS
- ML: case-insensitive dataset preflight, 재현 가능한 80/10/10 split, MobileNetV3 Small 2단계 학습, weighted cross entropy, 실제 평가 artifact 계약
- QA/운영: GitHub Actions, Docker compose, 배포 smoke, EAS preview profile, Playwright trace/screenshot

## 사전 조건

- Node.js 22.13 이상과 pnpm 10.14
- Python 3.12과 uv 0.11 계열
- 모바일 실행 시 Expo Go 또는 simulator
- 실제 학습 시 Kaggle dataset과 충분한 CPU/GPU 시간

## 설치

```powershell
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm install --frozen-lockfile
cd apps/api
uv sync
cd ../..
```

환경 파일을 준비합니다.

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

## Mock 데모 실행

`apps/api/.env`에서 `APP_ENV=development`, `INFERENCE_MODE=mock`을 사용합니다.

```powershell
# 각각 별도 터미널
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

- Web: `http://localhost:3000`
- API health: `http://localhost:8000/api/v1/health`
- OpenAPI: `http://localhost:8000/docs`

실제 휴대폰에서 `localhost`는 휴대폰 자신입니다. `EXPO_PUBLIC_API_BASE_URL=http://192.168.0.42:8000`처럼 개발 PC의 LAN IP를 사용하세요. 앱 개발 화면의 `개발용 API 진단`에서 health와 fallback을 확인할 수 있습니다.

## 데이터 preflight와 실제 학습

Credential이 이미 구성되지 않았다면 저장소가 Kaggle 다운로드를 자동 시도하지 않습니다. dataset 경로는 CLI가 환경 변수보다 우선합니다.

```powershell
cd ml
uv sync
uv run python preflight.py --data-dir C:/absolute/path/to/garbage-classification-v2 --check-corrupt
uv run python train.py `
  --data-dir C:/absolute/path/to/garbage-classification-v2 `
  --output-dir ../apps/api/models `
  --epochs-head 4 `
  --epochs-finetune 3 `
  --batch-size 32 `
  --device cuda `
  --seed 42 `
  --check-corrupt
```

학습은 versioned `artifacts/model/<run-id>/`에 checkpoint, metadata, config/history, test metrics/report/confusion matrix와 상대경로 manifest를 만들고 런타임 모델·metadata를 `apps/api/models/`에 복사합니다. binary는 Git ignore 대상입니다.

Windows/Linux의 ML 환경은 `uv sync` 시 공식 CUDA 13.0 PyTorch wheel을 사용합니다. `--device cuda`는 GPU를 사용할 수 없으면 즉시 실패하고, 기본 `--device auto`는 CUDA 우선/CPU fallback입니다. 다음 명령에서 `True`와 NVIDIA GPU 이름이 출력되는지 먼저 확인할 수 있습니다.

Windows 학습은 CUDA DLL을 worker마다 중복 로드하지 않도록 DataLoader의 기본값이 `--num-workers 0`입니다. `WinError 1455`가 발생하면 worker 수를 늘리지 말고 page file 설정을 확인하세요.

```powershell
uv run python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

실제 모델 연결:

```dotenv
APP_ENV=development
INFERENCE_MODE=model
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
```

development에서 artifact/dependency 오류는 health의 `fallbackReason`과 함께 mock으로 전환할 수 있습니다. production의 명시적 model mode는 artifact·metadata·class order·state dict 오류에서 fail-fast합니다.

```powershell
pnpm test:model
pnpm test:model:actual
```

첫 명령은 임시 state dict로 계약을 검사합니다. 두 번째는 실제 artifact가 없으면 명확히 `SKIP`합니다.

## 테스트와 빌드

```powershell
pnpm validate:guides
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:ml
pnpm test:model
pnpm test:onnx
pnpm build
pnpm --filter mobile exec expo-doctor

cd apps/api
uv sync
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run pytest
```

Playwright Chromium이 없다면 `pnpm --filter web exec playwright install chromium`을 한 번 실행합니다. E2E runner는 Next.js와 실제 FastAPI mock 서버를 함께 시작합니다.

## Docker와 배포

로컬 mock compose:

```powershell
docker compose up --build
```

운영은 `APP_ENV=production`, `INFERENCE_MODE=model`, model dependency/image, HTTPS Web/API URL, exact HTTPS CORS origin, SQLite persistent volume이 모두 필요합니다. `NEXT_PUBLIC_API_BASE_URL`은 Web build-time 값입니다.

```powershell
node scripts/smoke-deployment.mjs `
  --api https://api.example.com `
  --web https://web.example.com
```

자세한 환경 행렬과 rollback은 [배포 문서](docs/deployment.md)에 있습니다. 현재 공개 URL과 credential이 없어 실제 배포는 수행하지 않았습니다.

## ONNX 선택 검토

```powershell
cd ml
uv sync --extra onnx
uv run python export_onnx.py --model ../apps/api/models/garbage_classifier.pt --metadata ../apps/api/models/metadata.json --output ../apps/api/models/garbage_classifier.onnx --opset 17
uv run python onnx_evaluate.py --model ../apps/api/models/garbage_classifier.pt --metadata ../apps/api/models/metadata.json --onnx ../apps/api/models/garbage_classifier.onnx --fixture image1.jpg --fixture image2.jpg --fixture image3.jpg
```

ONNX는 현재 API runtime을 대체하지 않습니다. 실제 checkpoint와 대표 fixture로 parity·p95·artifact size를 측정하기 전에는 더 빠르다고 결론 내리지 않습니다.

## 데모 시나리오

1. Web `/classify`에서 팀이 준비한 이미지를 업로드합니다.
2. Top 3와 confidence, `데모(mock)` 또는 실제 모델 표시를 확인합니다.
3. `맞아요` 또는 `다른 종류 선택`으로 결과를 확정합니다.
4. 세부 품목과 체크리스트를 보여줍니다.
5. dashboard에서 익명 분류·수정 통계를 확인합니다.
6. 모바일에서는 gallery fallback과 개발용 API 진단을 백업 경로로 준비합니다.

## 알려진 제한

- 한 이미지의 대표 물체 하나만 10개 대분류로 분류합니다.
- 실제 dataset 학습·스마트폰 사진 평가·공개 배포·Android/iOS 실기기 QA는 이 환경에서 실행하지 않았습니다.
- 지자체별 규정, 오염도, 복합재질은 최종 사용자가 별도로 확인해야 합니다.
- 임시 모델/ONNX smoke 성공은 실제 정확도나 성능 우위를 의미하지 않습니다.

데이터셋 출처: [Kaggle Garbage Classification V2](https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2)
