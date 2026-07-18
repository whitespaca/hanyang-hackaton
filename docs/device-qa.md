# 모바일 실제 기기 QA

## 실행 기록

```text
Date: 2026-07-19
Commit: 63681dfd5a6f8126a389740ebb9b1f362ae75521 + current working-tree changes
Device: NOT AVAILABLE
OS: NOT RUN
Expo Go / Preview version: NOT RUN
API URL: NOT RUN on device
Inference mode: model verified on development PC only
Model version: gcv2-mobilenetv3s-20260718-1529
Tester: Codex automated checks only
```

Android LAN: **NOT RUN — physical Android device unavailable**

Android public API: **NOT RUN — public API not deployed**

iOS LAN: **NOT RUN — physical iOS device and macOS/Xcode environment unavailable**

iOS public API: **NOT RUN — public API not deployed**

| Scenario | Android | iOS | Evidence | Notes |
|---|---|---|---|---|
| Camera permission dialog/capture | NOT RUN | NOT RUN | 없음 | OS dialog와 native camera는 물리 기기 필요 |
| Gallery select/cancel/orientation | NOT RUN | NOT RUN | 없음 | unit logic만 검증 |
| LAN health/model classification | NOT RUN | NOT RUN | 없음 | LAN IP 후보는 확인했지만 device evidence 없음 |
| Public API classification | NOT RUN | NOT RUN | 없음 | 공개 URL 없음 |
| Resize/JPEG upload contract | AUTOMATED PASS | AUTOMATED PASS | mobile Jest | native manipulator 결과 수동 확인 필요 |
| Permission denied/restricted UI | AUTOMATED PASS | AUTOMATED PASS | mobile tests | 실제 설정 이동은 수동 확인 필요 |
| Timeout/offline/retry UI | AUTOMATED PASS | AUTOMATED PASS | shared/mobile tests | airplane-mode 수동 확인 필요 |
| History limit/no image data | AUTOMATED PASS | AUTOMATED PASS | history tests | 앱 재시작 persistence 수동 확인 필요 |
| Android back / iOS gesture | NOT RUN | NOT RUN | 없음 | 실제 navigation gesture 필요 |

## 자동 준비 상태

- `EXPO_PUBLIC_API_BASE_URL` 검증과 실제 기기 loopback 경고
- Android emulator `10.0.2.2` 허용
- 개발 전용 health 진단: URL, HTTP status, mode, model loaded/version, fallback/error
- 긴 변 1280px 비율 유지와 JPEG quality 0.8
- camera/gallery 권한 분기와 갤러리 대안
- history 최대 20개, 원본 URI/binary 미저장
- Expo doctor와 mobile test 명령

## 수동 실행 절차

1. PC와 기기를 같은 Wi-Fi에 연결하고 VPN/AP isolation을 끕니다.
2. Windows `ipconfig`에서 활성 adapter의 IPv4를 확인합니다.
3. API를 `0.0.0.0:8000` model mode로 시작하고 Windows Firewall private network를 허용합니다.
4. `apps/mobile/.env`에 `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:8000`을 설정하고 Expo cache를 초기화합니다.
5. 기기 브라우저와 앱의 개발용 API 진단에서 health/version/fallback을 캡처합니다.
6. 카메라 허용·거절, gallery 취소, 세로/가로/대형 이미지, correction/guide/feedback, offline/retry, 앱 재시작 history를 확인합니다.
7. 공개 API 배포 후 LAN 결과와 분리해 같은 시나리오를 반복합니다.
8. 개인 사진 대신 민감하지 않은 test object를 사용하고 device/OS/Expo/request ID/evidence를 이 문서에 기록합니다.
