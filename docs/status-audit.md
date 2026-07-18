# P1/P2 상태 감사

## 감사 기준

- 날짜: 2026-07-18 (Asia/Seoul)
- branch: `main`
- baseline commit: `bbb1fc80d9da29f6b4f8d7e4ca7b1180b282f172`
- baseline worktree: clean
- 구현 후 상태: 이 문서에 적힌 변경은 아직 commit되지 않은 working tree
- 로컬 도구: Node 24.15.0, pnpm 10.14.0(Corepack), Python 3.12.8/uv Python 3.12.13, uv 0.11.29
- 저장소 권장 Node: 22.13 이상(Node 22 CI 구성)

## 외부 입력 상태

| 항목 | 상태 | 증거/설명 |
|---|---|---|
| `GARBAGE_DATASET_DIR` | NOT SET | 현재 process 환경에 없음 |
| Kaggle dataset | NOT FOUND | workspace 안에 dataset 구조 없음 |
| runtime `.pt` | NOT FOUND | `apps/api/models/garbage_classifier.pt` 없음 |
| runtime `metadata.json` | NOT FOUND | example만 존재 |
| 실제 metrics | NOT FOUND | 실제 학습 결과 없음 |
| Android/iOS 물리 기기 | NOT AVAILABLE | 실기기 evidence 없음 |
| 배포 credential/URL | NOT AVAILABLE | 공개 API/Web project가 제공되지 않음 |
| Docker daemon | NOT AVAILABLE | Docker client 28.3.3, daemon pipe 연결 실패 |

## Baseline

초기 clean checkout에서 다음이 통과했습니다.

- `pnpm install --frozen-lockfile`: PASS (sandbox network 제한 후 승인된 네트워크로 재실행)
- `pnpm validate:guides`: PASS, 10 categories / 26 subcategories
- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
- `pnpm test:ml`: PASS, 2 tests
- `pnpm test:model`: PASS, 3 tests
- `pnpm test:e2e`: PASS, 기존 1 scenario
- `pnpm --filter mobile exec expo-doctor`: PASS, 20/20 checks
- API `ruff check`, `ruff format --check`, `mypy app`, `pytest`: PASS

## 구현 후 로컬 검증

| 영역 | 결과 |
|---|---|
| Root lint/typecheck/test/build | PASS |
| API base after `uv sync` | PASS: 14 passed, 1 model-dependency skip (before expanded model contract tests) |
| API full environment after model extra | PASS: 21 passed |
| API temporary model integration | PASS: 7 passed |
| Actual model check | SKIP: artifact/metadata missing |
| ML | PASS: 8 passed, 1 filesystem-case skip (ONNX extra installed) |
| ONNX temporary artifact | PASS: export/checker/runtime parity 1 test |
| Web unit | PASS: 4 passed |
| Web Playwright | PASS: 8 passed against real FastAPI mock server |
| Mobile | PASS: 7 passed |
| Expo doctor | PASS: 20/20 online checks |
| Docker static config | PASS: `docker compose config` |
| Docker build/runtime | FAIL/NOT RUN: build could not start because Docker daemon pipe was unavailable |
| Public deploy smoke | NOT RUN: URLs/credentials unavailable |
| Physical device QA | NOT RUN: devices unavailable |

알려진 경고는 Starlette TestClient의 httpx2 전환 deprecation과 PyTorch legacy ONNX exporter deprecation입니다. 현재 테스트 실패는 아니며 후속 dependency upgrade에서 처리합니다.

## 구현 범위 결론

- 실제 모델: **PARTIAL — CODE READY, TRAINING NOT RUN**
- Playwright: **PASS**
- Device: **AUTOMATION READY, MANUAL DEVICE QA REQUIRED**
- Deployment: **DEPLOYMENT READY, NOT DEPLOYED**
- Animation: Web/Mobile 경량 전환과 reduced motion 구현
- ONNX: 임시 계약 smoke 완료, 실제 artifact benchmark와 runtime 채택은 보류
