# 분리샷 사용자·시연 가이드

## 서비스 흐름

```text
사진 촬영/업로드 → AI Top 3와 confidence → 사용자 확인/수정
→ 세부 품목 선택 → 배출 체크리스트 → 익명 피드백/통계
```

AI 예측은 참고 정보입니다. 결과를 확인하거나 직접 수정한 뒤 가이드를 사용하고, 지역별 배출 기준도 최종 확인하세요.

지원 클래스는 금속, 유리, 음식물·생물성, 종이, 배터리, 일반쓰레기, 골판지, 신발, 의류, 플라스틱입니다.

## 5분 로컬 실행

```powershell
corepack prepare pnpm@10.14.0 --activate
pnpm install --frozen-lockfile
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

`apps/api/.env`는 `APP_ENV=development`, `INFERENCE_MODE=mock`으로 둡니다. 이후 세 터미널에서 실행합니다.

```powershell
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

- Web: `http://localhost:3000`
- API health: `http://localhost:8000/api/v1/health`
- API docs: `http://localhost:8000/docs`

## Web 사용법

1. `/classify`에서 JPG, PNG 또는 WebP 파일을 선택하거나 끌어놓습니다.
2. preview를 확인하고 `분석하기`를 누릅니다.
3. Top 3, confidence, mock/model 표시를 확인합니다.
4. 결과가 맞으면 `맞아요`, 다르면 `다른 종류 선택`을 누릅니다.
5. 세부 품목을 선택해 체크리스트를 확인합니다.
6. 피드백 저장 실패 경고가 떠도 가이드는 계속 사용할 수 있습니다.
7. `처음부터 다시`로 이미지 URL과 flow state를 초기화합니다.

8 MiB 초과, 지원하지 않는 MIME, 손상 이미지, API 연결 실패에는 한국어 오류와 재시도 경로가 표시됩니다.

### 수거 장소

1. 품목 상세의 `가까운 배출 장소 찾기` 또는 상단 `수거 장소`를 엽니다.
2. 위치 권한 전에도 춘천시 동면 시연용 fixture 목록을 볼 수 있습니다.
3. `현재 위치 사용`을 누르면 그때만 위치 권한을 요청하고 10km 안의 장소를 거리순으로 표시합니다.
4. 유형 필터, 주소 복사, 지도에서 보기와 길찾기를 사용할 수 있습니다.
5. 위치를 거부하거나 Kakao Web key/SDK가 없어도 목록과 외부 지도 링크는 유지됩니다.

정확한 위치는 DB, localStorage, AsyncStorage에 저장하지 않습니다. fixture 운영 정보는 바뀔 수 있으므로 방문 전 운영기관 안내를 확인하세요.

## Mobile 사용법

1. 홈에서 `사진 촬영` 또는 `갤러리에서 선택`을 누릅니다.
2. 카메라 권한이 거절·제한되어도 gallery 대안을 사용할 수 있습니다.
3. preview에서 사진을 확인합니다. 앱은 긴 변을 최대 1280px로 줄인 JPEG quality 0.8 복사본만 전송합니다.
4. Top 3 결과를 확인·수정하고 세부 품목을 선택합니다.
5. 가이드를 완료하면 이미지 없이 class, subcategory, confidence, timestamp만 최근 기록에 저장됩니다.
6. 최근 기록은 최신 20개까지만 유지됩니다.
7. 홈의 `수거 장소 찾기`에서 foreground 위치를 선택적으로 사용하고 주소 복사·외부 카카오맵 링크를 이용할 수 있습니다.

개발 빌드 홈의 `개발용 API 진단`은 현재 API URL, HTTP 상태, inference mode, model loaded/version, fallback reason을 표시합니다.

## 실제 기기 LAN 연결

실제 기기에서 `localhost`와 `127.0.0.1`은 개발 PC가 아니라 기기 자신을 가리킵니다. Android emulator만 `10.0.2.2`를 사용할 수 있습니다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.42:8000
```

1. PC와 휴대폰을 같은 Wi-Fi에 연결합니다.
2. Windows `ipconfig`로 PC IPv4를 확인합니다.
3. API를 `0.0.0.0:8000`에 실행하고 private network 방화벽을 허용합니다.
4. Expo를 재시작하고 개발용 API 진단을 실행합니다.
5. [기기 QA 문서](docs/device-qa.md)에 device/OS/Expo/API/model/evidence를 기록합니다.

현재 checkout에서는 물리 Android/iOS와 LAN 분류를 실행하지 않았습니다.

## 실제 모델 준비

```powershell
cd ml
uv run python preflight.py --data-dir C:/absolute/path/to/dataset --check-corrupt
uv run python train.py --data-dir C:/absolute/path/to/dataset --output-dir ../apps/api/models --epochs-head 4 --epochs-finetune 3 --batch-size 32 --seed 42 --check-corrupt
cd ..
pnpm test:model:actual
```

`apps/api/.env`에서 `INFERENCE_MODE=model`로 전환하고 health가 `modelLoaded=true`, `inferenceMode=model`, `fallbackReason=null`인지 확인합니다. production에서는 artifact 문제가 있으면 API가 시작에 실패하는 것이 정상입니다.

검증된 모델은 `gcv2-mobilenetv3s-20260718-1529`입니다. 로컬 test set 1,227장에서 Accuracy 90.87%, Macro F1 90.37%, Top-3 Accuracy 98.21%를 기록했습니다. 이 수치는 학습 dataset과 같은 출처의 test split 결과이며 실제 스마트폰 촬영 정확도를 보장하지 않습니다.

실제 모델 Web 흐름은 다음 optional smoke로 다시 확인할 수 있습니다. artifact가 없으면 실패 이유를 명확히 출력하며 기본 CI의 mock E2E에는 영향을 주지 않습니다.

```powershell
pnpm test:e2e:model
```

## 발표 전 체크

- [ ] API health와 inference 표시 확인
- [ ] Web happy/correction/low-confidence 흐름 리허설
- [ ] 실제 기기 API 진단 성공
- [ ] 카메라 권한 거절 시 gallery fallback 확인
- [ ] mock 백업임을 화면과 발표에서 명시
- [ ] fixture 이미지와 네트워크 실패 백업 준비
- [ ] dashboard demo/live 표시 확인
- [ ] 지역별 기준 고지 확인

현재 Android/iOS 항목은 물리 기기 없이 자동 검사만 완료된 상태입니다. 공개 API/Web도 아직 배포되지 않았습니다.

권장 발표 메시지:

> 분리샷은 AI가 정답을 단정하지 않습니다. 후보를 빠르게 좁히고 사용자가 확인해 실제 배출 행동으로 이어지도록 돕습니다.

## 문제 해결

- `pnpm`이 없으면 `corepack prepare pnpm@10.14.0 --activate` 후 터미널을 다시 엽니다.
- 모바일 연결 실패는 LAN IP, 같은 Wi-Fi, API `0.0.0.0` bind, 방화벽 순서로 확인합니다.
- CORS는 Web의 정확한 origin을 쉼표로 구분합니다. production은 wildcard, loopback, HTTP origin을 거부합니다.
- 모델 누락 시 development는 mock fallback reason을 확인하고, production은 artifact를 복구한 뒤 재시작합니다.
- Web 환경 변수 `NEXT_PUBLIC_API_BASE_URL`은 build-time 값이므로 변경 후 Web을 다시 build합니다.

더 자세한 내용은 [README](README.md), [배포 문서](docs/deployment.md), [troubleshooting](docs/troubleshooting.md)을 참고하세요.

```
cd apps/api

$env:APP_ENV="development"
$env:INFERENCE_MODE="model"
$env:MODEL_PATH="./models/garbage_classifier.pt"
$env:MODEL_METADATA_PATH="./models/metadata.json"

uv run --extra model python -m uvicorn app.main:app `
  --host 0.0.0.0 `
  --port 8000

pnpm --filter mobile start --clear
```
