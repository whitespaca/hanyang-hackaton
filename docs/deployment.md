# API·Web 배포

## 현재 판정

**DEPLOYMENT READY, NOT DEPLOYED**

- API URL: NOT DEPLOYED
- Web URL: NOT DEPLOYED
- provider/credential: NOT AVAILABLE
- model: `gcv2-mobilenetv3s-20260718-1529`, 로컬 package와 checksum 준비 완료
- Docker: `docker compose config` PASS, build/runtime는 daemon pipe가 없어 NOT RUN
- public CORS/smoke/mobile public API: NOT RUN

## 배포 계약

| 환경 | APP_ENV | INFERENCE_MODE | CORS | model 정책 |
|---|---|---|---|---|
| local demo | development | mock | local exact origin | artifact 불필요 |
| local model | development/test | model | local exact origin | 오류 시 명시적 fallback 가능 |
| production | production | model | exact HTTPS Web origin | artifact/dependency/metadata/state 오류 fail-fast |

API:

```dotenv
APP_ENV=production
INFERENCE_MODE=model
MODEL_PATH=/app/models/garbage_classifier.pt
MODEL_METADATA_PATH=/app/models/metadata.json
DATABASE_URL=sqlite:////app/runtime/app.db
MAX_UPLOAD_BYTES=8388608
CONFIDENCE_THRESHOLD=0.65
CORS_ORIGINS=https://actual-web.example
```

Web build:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://actual-api.example
```

`NEXT_PUBLIC_API_BASE_URL`은 browser bundle에 build-time으로 포함되므로 URL 변경 뒤 Web image를 다시 build합니다.

## 모델 전달

현재 compose는 `/app/models` read-only mount와 `/app/runtime` persistent SQLite volume을 사용합니다. 배포 전 다음 명령으로 matching model/metadata, 실제 평가 자료와 checksum ZIP을 만듭니다.

```powershell
uv run --project apps/api python scripts/package-model-release.py `
  --model apps/api/models/garbage_classifier.pt `
  --metadata apps/api/models/metadata.json `
  --output dist/model/gcv2-mobilenetv3s-20260718-1529
```

Provider에서는 다음 중 하나를 명시적으로 선택합니다.

1. trusted CI가 release ZIP을 내려받고 SHA-256 검증 후 read-only volume에 원자적으로 배치
2. 비공개 artifact store의 immutable version URL에서 startup 전 다운로드·검증
3. 승인된 local build context에 model을 주입한 Docker image

일반 Git commit이나 dataset 원본을 전달 수단으로 사용하지 않습니다. 실제 GitHub Release publish는 승인과 credential이 없어 수행하지 않았습니다.

## Docker 검증

```powershell
$env:APP_ENV="production"
$env:INFERENCE_MODE="model"
$env:INSTALL_MODEL_DEPS="true"
$env:CORS_ORIGINS="https://actual-web.example"
$env:NEXT_PUBLIC_API_BASE_URL="https://actual-api.example"
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

완료 기준은 API non-root 실행, `/app/models` read-only, `/app/runtime` writable/persistent, health actual model/no fallback, SQLite feedback write입니다. 이번 환경에서는 daemon이 없어 static config 이후 단계는 실행하지 않았습니다.

## CORS와 smoke

Production CORS는 `*`, HTTP origin, localhost/loopback, path/query/fragment를 거부합니다. 쉼표 origin은 trim하고 빈 값을 제거하며 credentials는 false입니다. 로컬 production-like test에서 exact origin, denied origin, POST preflight, expected headers를 통과했습니다.

```powershell
node scripts/smoke-deployment.mjs `
  --api https://actual-api.example `
  --web https://actual-web.example `
  --allowed-origin https://actual-web.example `
  --fixture C:/path/to/manual-fixture.jpg
```

공개 smoke는 HTTPS Web/API, health model/no fallback/version, allowed/denied CORS, credentials header 부재와 classification Top-3를 검증합니다.

## Deployment record

```text
Deployment commit: NOT DEPLOYED
API provider / URL / version: NOT DEPLOYED
Web provider / URL / version: NOT DEPLOYED
Model version: gcv2-mobilenetv3s-20260718-1529 (local verified)
CORS origin: NOT CONFIGURED publicly
Storage: persistent SQLite volume required, NOT PROVISIONED
Smoke: NOT RUN publicly
Rollback target: NOT CREATED
```

## Rollback

1. 배포마다 API/Web image digest, model version/checksum, DB volume snapshot 식별자를 기록합니다.
2. health 또는 smoke 실패 시 직전 image로 traffic을 되돌립니다.
3. model 문제는 matching `.pt`와 metadata를 함께 원자적으로 이전 version으로 바꿉니다.
4. Web API URL/CORS mismatch는 직전 Web image와 API CORS 설정을 함께 복구합니다.
5. SQLite volume은 삭제하지 않고 schema 호환성을 확인합니다.
6. 운영에서 mock으로 조용히 전환하지 않습니다.
