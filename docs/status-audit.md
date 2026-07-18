# P1/P2 상태 감사

## 감사 기준

- 감사 날짜: 2026-07-19 (Asia/Seoul)
- branch: `docs/android-device-qa-pass`
- 검증 기준 commit: `e38703dab54cb8997a172813bc30d1288cd2f1d4` (`origin/main`)
- 작업 시작 상태: clean
- 현재 상태: Android 실기기 access-log evidence를 문서에 반영하는 문서 전용 변경
- CI: GitHub Actions run `29663299848`에서 초기 PR 문서 커밋 `d3dd526`의 `node`, `api`, `ml-smoke`, `e2e` job 모두 PASS

## 실제 모델과 평가 자료

| 항목 | 상태 | 증거 |
|---|---|---|
| runtime model | PASS | `apps/api/models/garbage_classifier.pt`, 6,236,373 bytes |
| runtime metadata | PASS | version `gcv2-mobilenetv3s-20260718-1529`, canonical 10-class order |
| versioned artifact | PASS | `artifacts/model/gcv2-mobilenetv3s-20260718-1529/`, 계약 파일 11개 |
| metric consistency | PASS | test/report/confusion support 1,227, distribution 합계 일치 |
| model SHA-256 | PASS | `8828193dfddc7b2c32f4a0c88b288e56659af6bf13047026e9ae06468590ec71` |
| release package | PASS, local only | `dist/model/gcv2-mobilenetv3s-20260718-1529.zip`, Git 제외 |
| actual API model test | PASS | 실제 state dict load, health, Top-3, no fallback |
| actual Web E2E | PASS | 실제 FastAPI model mode와 Next.js 전체 흐름 1개 |

실제 test 결과는 Accuracy `0.908720456397718`, Macro F1 `0.9037076373391809`, Weighted F1 `0.9087555381472769`, Top-3 Accuracy `0.9820700896495518`, low-confidence rate `0.09046454767726161`입니다.

## 외부 환경 상태

| 영역 | 상태 | 이유 |
|---|---|---|
| Android LAN API reachability | PASS | tester가 제공한 `GET /api/v1/health` 200 access log |
| Android multipart classification | PASS | tester가 제공한 `POST /api/v1/classifications` 200 access log |
| Android guide/feedback flow | PASS | category/detail guide 200, feedback 201 access log |
| Android extended QA | NOT RUN | camera/gallery 독립 실행, offline/retry, history, back evidence 없음 |
| iOS physical QA | DEFERRED | 물리 기기 없음; 현재 Android 중심 릴리스 범위 밖 |
| public API/Web deployment | NOT DEPLOYED | provider project와 credential, 실제 URL 없음 |
| production public CORS | NOT RUN | 공개 origin 없음 |
| Docker static config | PASS | `docker compose config` |
| Docker build/runtime | NOT RUN | Docker client는 있으나 daemon pipe 연결 불가 |

### Android physical-device status

Verified from FastAPI access logs supplied by the tester:

- LAN health endpoint: PASS
- Multipart classification request: PASS
- Main guide request: PASS
- Detailed guide request: PASS
- Feedback submission: PASS

Not yet verified:

- health payload model mode (`modelLoaded`, `inferenceMode`, `fallbackReason`)
- camera and gallery as separate input paths
- offline/timeout/retry
- history persistence
- Android back behavior

## 저장소 위생

- `dataset/`은 이제 `.gitignore`로 신규 추적을 차단합니다.
- 기존 Git index에는 dataset 파일 12,259개가 남아 있습니다.
- GitHub API가 보고한 repository size는 506,551 KiB이며, 로컬 pack은 `git count-objects -vH` 기준 1.54 GiB입니다.
- dataset tip 제거, history rewrite, LFS migration은 사용자 승인 없이 수행하지 않았습니다.
- `.pt`, `.pth`, `.onnx`, `artifacts/model/`, `dist/`는 일반 Git commit에서 제외됩니다.

## 이전 자동 검증 기록

- PASS: frozen `pnpm install`, guide validation, lint, typecheck, unit tests, build
- PASS: API ruff/format/mypy/22 tests와 model predictor 7 tests
- PASS: ML ruff/format/11 passed·1 platform skip, ONNX test
- PASS: mock Playwright 8 tests, actual-model Playwright 1 test
- PASS: actual model test, Expo doctor 20/20, production-like API/CORS smoke
- PASS: production environment를 넣은 `docker compose config`
- NOT RUN: Docker build/runtime, public deployment smoke

이번 문서 반영 작업의 초기 커밋 `d3dd526`은 GitHub Actions run `29663299848`에서 검증됐습니다.

## 판정

- 실제 모델: **PASS — LOCAL ARTIFACT/API/WEB VERIFIED**
- Playwright: **PASS — 8 MOCK SCENARIOS + 1 ACTUAL-MODEL SMOKE**
- Device: **ANDROID LAN CORE REQUESTS PASS; EXTENDED MANUAL QA REQUIRED**
- Deployment: **DEPLOYMENT READY, NOT DEPLOYED**
- ONNX: **ACTUAL PARITY/BENCHMARK PASS, RUNTIME ADOPTION DEFERRED**
