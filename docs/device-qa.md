# 모바일 실제 기기 QA

## 실행 기록

```text
Date: 2026-07-18
Commit: bbb1fc80d9da29f6b4f8d7e4ca7b1180b282f172 + uncommitted P1/P2 changes
Device: NOT AVAILABLE
OS: NOT RUN
Expo Go / Preview version: NOT RUN
API URL: NOT RUN
Inference mode: NOT RUN
Model version: NOT RUN
Tester: Codex automated checks only
```

| Scenario | Android | iOS | Evidence | Notes |
|---|---|---|---|---|
| Camera permission dialog | NOT RUN | NOT RUN | 없음 | physical device unavailable |
| Camera capture/preview | NOT RUN | NOT RUN | 없음 | physical device unavailable |
| Gallery select/cancel | NOT RUN | NOT RUN | 없음 | physical device unavailable |
| LAN health/classification | NOT RUN | NOT RUN | 없음 | device/LAN unavailable |
| Image resize/JPEG upload | AUTOMATED PASS | AUTOMATED PASS | Jest resize test | native manipulator requires manual confirmation |
| Network timeout/error UX | AUTOMATED PASS | AUTOMATED PASS | shared client + mobile tests | airplane-mode manual test required |
| Permission denied/restricted UI | AUTOMATED PASS | AUTOMATED PASS | mobile permission branch tests | OS dialog manual test required |
| History survives restart | NOT RUN | NOT RUN | limit/storage unit coverage only | app restart manual test required |
| Android back | NOT RUN | N/A | 없음 | Android device required |

Android: **NOT RUN — physical device unavailable**

iOS: **NOT RUN — device/macOS signing environment unavailable**

LAN API: **NOT RUN — physical device and LAN evidence unavailable**

## 자동 준비 완료 항목

- `EXPO_PUBLIC_API_BASE_URL` parsing과 invalid URL fallback
- 실제 기기 `localhost`/`127.0.0.1` 경고, Android emulator `10.0.2.2` 허용
- 개발 전용 health 진단: URL, HTTP, mode, model loaded/version, fallback/error
- 1280px aspect-ratio 계산과 JPEG quality 0.8 upload
- not-determined/granted/denied/restricted/unavailable 권한 상태 helper
- camera 권한이 없어도 gallery를 사용할 수 있다는 한국어 안내
- 원본 URI/binary를 history에 저장하지 않는 기존 계약
- Expo doctor 자동 검증

## 수동 실행 절차

1. PC와 기기를 같은 Wi-Fi에 연결합니다.
2. `ipconfig`로 PC IPv4를 확인합니다.
3. `apps/mobile/.env`에 `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:8000`을 설정합니다.
4. `pnpm dev:api`, `pnpm dev:mobile`을 실행하고 private network 방화벽에서 8000을 허용합니다.
5. 홈 `개발용 API 진단`에서 HTTP 200과 mode/model/fallback을 캡처합니다.
6. 카메라 허용·거절·제한, gallery 취소, 촬영/분류, 네트워크 단절, restart history, Android back을 실행합니다.
7. 위 표에 device/OS/Expo version, screenshot/video/log 위치와 결과를 기록합니다.
