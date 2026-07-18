# Release checklist

2026-07-19 기준 실제 evidence가 있는 항목만 체크합니다.

- [x] actual model artifacts created locally
- [x] model evaluation committed with real metrics
- [x] API model mode verified with temporary contract artifact
- [x] API model mode verified with actual trained artifact
- [x] actual model Web Playwright smoke pass
- [x] deterministic mock Playwright E2E pass (8 scenarios)
- [x] latest known GitHub Actions CI pass at `63681df`
- [x] production CORS policy tests pass locally
- [x] model release package/checksum created locally
- [x] Expo doctor pass
- [x] ONNX actual export/parity/CPU benchmark pass
- [ ] Android physical device verified
- [ ] iOS physical device verified
- [ ] API deployed
- [ ] Web deployed
- [ ] production CORS verified against deployed origins
- [ ] mobile public API verified
- [ ] Docker image runtime verified
- [ ] model release package published
- [ ] current working-tree changes verified by remote CI

Release blockers are physical-device evidence, public HTTPS deployment/CORS smoke, Docker runtime evidence, release asset publication approval, and remote CI for the current changes.
