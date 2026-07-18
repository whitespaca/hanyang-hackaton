# Release checklist

2026-07-19 기준 실제 evidence가 있는 항목만 체크합니다.

## Verified

- [x] actual model artifacts created locally
- [x] model evaluation committed with real metrics
- [x] API model mode verified with temporary contract artifact
- [x] API model mode verified with actual trained artifact
- [x] actual model Web Playwright smoke pass
- [x] deterministic mock Playwright E2E pass (8 scenarios)
- [x] production CORS policy tests pass locally
- [x] model release package/checksum created locally
- [x] Expo doctor pass
- [x] ONNX actual export/parity/CPU benchmark pass
- [x] Android physical-device LAN health request
- [x] Android multipart classification upload
- [x] Android disposal-guide retrieval
- [x] Android feedback submission

## Current release blockers

- [ ] Actual model mode confirmed from the Android health payload
- [ ] Camera path independently verified
- [ ] Gallery path independently verified
- [ ] Offline/timeout/retry verified
- [ ] History persistence verified
- [ ] Android system back verified
- [ ] API deployed publicly
- [ ] Web deployed publicly
- [ ] Production CORS verified against deployed origins
- [ ] Android public HTTPS API verified
- [ ] Docker image runtime verified
- [ ] Model release package published

CI status: **PASS** — GitHub Actions run `29663299848`에서 초기 PR 문서 커밋 `d3dd526`의 `node`, `api`, `ml-smoke`, `e2e` job이 모두 성공했습니다.

## Deferred validation

- [ ] iOS physical-device QA — out of current release scope because no device is available

iOS physical-device QA is not a blocker for the current Android-focused hackathon release.
