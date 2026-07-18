# 배포 준비

## Docker 기반 Web + API

기본 구성은 실제 모델이 없는 mock mode입니다.

```powershell
docker compose up --build
```

- Web: `http://localhost:3000`
- API health: `http://localhost:8000/api/v1/health`
- SQLite 데이터: `api-runtime` 볼륨
- 업로드 원본: 저장하지 않음

실제 모델을 포함하려면 `apps/api/models/garbage_classifier.pt`와 `metadata.json`을 준비하고 다음 환경 변수를 설정합니다.

```powershell
$env:INSTALL_MODEL_DEPS="true"
$env:INFERENCE_MODE="model"
docker compose up --build
```

운영 Web과 API가 서로 다른 도메인이라면 build 시 공개 API URL과 API CORS origin을 함께 지정해야 합니다.

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="https://api.example.com"
$env:CORS_ORIGINS="https://www.example.com"
docker compose up --build
```

`NEXT_PUBLIC_API_BASE_URL`은 Next.js 브라우저 번들에 build 시 포함됩니다. 배포 후 컨테이너 환경 변수만 바꾸는 것으로는 변경되지 않으므로 Web을 다시 build해야 합니다.

## 운영 점검

1. `/api/v1/health`의 `inferenceMode`, `modelLoaded`, `fallbackReason`을 확인합니다.
2. production model mode에서 artifact가 없을 때 API가 시작에 실패하는지 확인합니다.
3. 실제 Web origin만 `CORS_ORIGINS`에 등록합니다. wildcard는 허용하지 않습니다.
4. `/app/runtime`에 쓰기 가능한 영속 볼륨을 연결합니다.
5. CPU 실제 이미지 10장으로 p50/p95 추론 시간을 측정합니다.

## Expo preview build

`apps/mobile/eas.json`에 내부 배포용 preview APK profile을 제공합니다. 최초 한 번 `eas init`으로 팀의 Expo project ID를 연결해야 하며, 저장소가 임의의 계정이나 project ID를 만들지는 않습니다.

```powershell
cd apps/mobile
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform android
```

EAS에 전달하는 `EXPO_PUBLIC_API_BASE_URL`은 HTTPS로 접근 가능한 API 주소를 사용합니다.
