# Release checklist

2026-07-18 현재 실제 상태입니다. 외부 evidence가 없는 항목은 체크하지 않았습니다.

- [ ] actual model artifacts created
- [ ] model evaluation committed with real metrics
- [x] API model mode verified with temporary contract artifact
- [ ] API model mode verified with actual trained artifact
- [x] Playwright E2E pass (8 scenarios, real mock API)
- [ ] Android physical device verified
- [ ] iOS physical device verified
- [ ] API deployed
- [ ] Web deployed
- [ ] production CORS verified against deployed origins
- [x] production CORS policy tests pass locally
- [ ] mobile public API verified
- [x] README updated to current status
- [x] mock fallback rehearsed by API tests
- [x] Expo doctor pass
- [x] ONNX temporary export/parity smoke pass

Release blockers: actual dataset training/evaluation, actual artifact API smoke, physical-device evidence, public deployment/HTTPS/CORS smoke.
