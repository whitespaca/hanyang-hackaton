# 문제 해결

## Expo 실제 기기에서 API 연결 실패

휴대폰의 `localhost`는 PC가 아닙니다. PC와 휴대폰을 같은 Wi-Fi에 연결하고 `ipconfig`/`ifconfig`로 LAN IP를 확인해 `EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8000`으로 설정합니다. FastAPI는 `--host 0.0.0.0`으로 실행하고 OS 방화벽을 확인합니다.

## CORS

브라우저 콘솔에 CORS 오류가 보이면 `apps/api/.env`의 쉼표 구분 `CORS_ORIGINS`에 정확한 Web origin을 추가하고 API를 재시작합니다. production에서 `*`는 거부됩니다.

## 모델 없음 / torch 없음

개발의 `INFERENCE_MODE=model`은 health의 `fallbackReason`을 남기고 mock으로 전환합니다. production은 시작 실패가 정상입니다. 모델 의존성은 `cd apps/api && uv sync --extra model`로 설치합니다. CUDA wheel이 필요하면 PyTorch 공식 설치 명령을 우선 사용하세요.

## uv 없음

Windows: `python -m venv .venv` 후 `.venv\Scripts\python -m pip install -e ".[dev]"`. macOS/Linux: `python -m venv .venv` 후 `.venv/bin/python -m pip install -e '.[dev]'`.

## 포트 충돌

Web 3000, Metro 8081, API 8000을 기본으로 사용합니다. Windows에서는 `Get-NetTCPConnection -LocalPort 8000`, macOS/Linux에서는 `lsof -i :8000`으로 점유 프로세스를 확인하세요. API 포트를 바꾸면 두 공개 API URL도 함께 변경합니다.

## Playwright Chromium 없음

`pnpm test:e2e`에서 browser executable 오류가 나면 다음을 한 번 실행합니다.

```powershell
pnpm --filter web exec playwright install chromium
```

CI에서는 dependency cache와 별도로 Playwright browser cache를 보존하거나 매 실행 설치해야 합니다.

## Docker model mode 시작 실패

실제 모델 Docker image는 torch 의존성이 필요합니다. `INSTALL_MODEL_DEPS=true`로 image를 다시 build하고, `apps/api/models`에 checkpoint와 metadata가 모두 있는지 확인합니다. `INFERENCE_MODE=model`, `APP_ENV=production` 조합은 누락 artifact를 mock으로 숨기지 않습니다.
