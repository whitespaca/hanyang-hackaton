# API·Web 배포

## 현재 상태

**DEPLOYMENT READY, NOT DEPLOYED**

공개 provider project, HTTPS URL, credential, 실제 model artifact가 제공되지 않아 배포와 공개 smoke는 실행하지 않았습니다. 이 문서는 provider-neutral Docker 계약을 정의합니다.

## 환경 행렬

| 환경 | APP_ENV | INFERENCE_MODE | CORS | model 정책 |
|---|---|---|---|---|
| local demo | development | mock | `http://localhost:3000` | artifact 불필요 |
| local model | development | model | local exact origins | 오류 시 fallback + health reason 가능 |
| production | production | model | exact HTTPS Web origin | artifact/dependency/metadata/state 오류 fail-fast |

운영 API:

```dotenv
APP_ENV=production
INFERENCE_MODE=model
MODEL_PATH=./models/garbage_classifier.pt
MODEL_METADATA_PATH=./models/metadata.json
DATABASE_URL=sqlite:///./data/app.db
MAX_UPLOAD_BYTES=8388608
CONFIDENCE_THRESHOLD=0.65
CORS_ORIGINS=https://web.example.com
```

운영 Web build:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

`NEXT_PUBLIC_API_BASE_URL`은 브라우저 bundle에 build-time으로 포함됩니다. 값 변경 후 Web image를 다시 build해야 합니다.

## 로컬 Docker

기본 compose는 `development/mock`입니다.

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

- Web: `http://localhost:3000`
- API: `http://localhost:8000/api/v1/health`
- SQLite: `api-runtime` persistent volume
- model directory: `apps/api/models` read-only mount
- Web/API 모두 healthcheck 포함

운영과 같은 model image를 만들 때:

```powershell
$env:APP_ENV="production"
$env:INFERENCE_MODE="model"
$env:INSTALL_MODEL_DEPS="true"
$env:CORS_ORIGINS="https://web.example.com"
$env:NEXT_PUBLIC_API_BASE_URL="https://api.example.com"
docker compose build
docker compose up -d
```

production에서 mock, missing `.pt`, invalid metadata/class order/state dict, PyTorch dependency 누락은 성공 배포로 간주하지 않습니다.

## CORS 정책

- 쉼표 구분 origin을 trim하고 빈 값을 제거합니다.
- origin은 `http(s)://host[:port]`만 허용하며 path/query/fragment를 거부합니다.
- production은 `*`, localhost, loopback IP, HTTP origin을 거부합니다.
- credentials는 false이며 GET/POST, Content-Type/X-Request-ID만 허용합니다.
- allowed/denied preflight와 multiple/whitespace origin은 API tests로 검증합니다.

## 배포 smoke

기본 smoke는 실제 model production을 요구합니다.

```powershell
node scripts/smoke-deployment.mjs `
  --api https://api.example.com `
  --web https://web.example.com `
  --allowed-origin https://web.example.com `
  --fixture C:/path/to/fixture.png
```

검증 항목은 Web HTTP 성공, API health, `modelLoaded=true`, `inferenceMode=model`, fallback 없음, allowed/denied CORS, credentials false, optional Top 3입니다. 로컬 mock 점검에만 `--allow-mock`을 사용할 수 있습니다.

## 영속성과 보안

- `/app/runtime`을 단일-writer SQLite persistent volume에 연결합니다.
- `/app/models`는 read-only로 배포합니다.
- HTTPS termination과 request body limit을 provider/proxy에도 적용합니다.
- 이미지 binary, filename, token, filesystem path를 로그에 남기지 않습니다.
- `.env`, dataset, `.pt/.pth/.onnx`는 image build context와 Git에서 관리에 주의합니다.

## Rollback

1. 직전 Web/API image digest와 model version을 배포 기록에 보존합니다.
2. 새 API health/smoke 실패 시 traffic을 직전 API image로 되돌립니다.
3. model만 문제라면 직전 `.pt`와 matching metadata를 함께 원자적으로 복구합니다.
4. Web API URL/CORS mismatch이면 직전 Web image와 CORS 설정을 함께 복구합니다.
5. SQLite volume을 삭제하지 말고 schema 호환성을 확인합니다.
6. 긴급 시연은 development/local에서만 명시적 mock으로 전환하고 운영 성공으로 표시하지 않습니다.

## 이번 환경의 검증

- `docker compose config`: PASS
- `docker compose build/up/ps`: NOT RUN — Docker daemon unavailable
- public API/Web smoke: NOT RUN — URL/credential/model artifact unavailable
