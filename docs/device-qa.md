# 모바일 실제 기기 QA

## Android physical-device QA record

- Date: 2026-07-19
- Platform: Android physical device
- Runtime: Expo Go
- Network: same-Wi-Fi LAN
- API bind: `0.0.0.0:8000`
- Device IP observed by API: `192.168.219.31`
- Evidence source: FastAPI access log supplied by tester
- Commit: **UNKNOWN — tester did not provide the tested SHA**
- Device/OS/Expo Go version: **UNKNOWN — not supplied**

### 확인된 시나리오

| Scenario | Status | Evidence |
|---|---|---|
| Android LAN health endpoint | PASS | `GET /api/v1/health` → `200 OK` |
| Android image upload/classification | PASS | `POST /api/v1/classifications` → `200 OK` |
| Main disposal guide | PASS | `GET /api/v1/guides/trash` → `200 OK` |
| Detailed disposal guide | PASS | `GET /api/v1/guides/trash/general-trash` → `200 OK` |
| Feedback submission | PASS | `POST /api/v1/classifications/{id}/feedback` → `201 Created` |

접근 로그는 Android 기기에서 LAN API 도달, multipart 분류 요청, 가이드 조회와 피드백 제출이 성공했음을 보여줍니다. 응답 본문이나 이미지 입력 출처까지 증명하지는 않습니다.

### 미확인 시나리오

| Scenario | Status | Reason |
|---|---|---|
| Health payload confirms actual model mode | NOT VERIFIED | Response body was not supplied |
| Camera path independently verified | NOT VERIFIED | Access log does not identify input source |
| Gallery path independently verified | NOT VERIFIED | Access log does not identify input source |
| Offline/timeout/retry | NOT RUN | No evidence supplied |
| History persistence | NOT RUN | No evidence supplied |
| Android system back navigation | NOT RUN | No evidence supplied |
| Public HTTPS API and production CORS | NOT RUN | No deployed URL or production smoke evidence supplied |

## iOS physical-device QA

**OUT OF CURRENT RELEASE SCOPE — no physical iOS device available**

Shared TypeScript and Expo configuration may be covered by automated checks, but camera, gallery, local-network, and gesture behavior were not verified on an iOS physical device. 이 항목은 현재 Android 중심 해커톤 릴리스의 blocker가 아닌 deferred validation입니다.

## 자동 준비 상태

- `EXPO_PUBLIC_API_BASE_URL` 검증과 실제 기기 loopback 경고
- Android emulator `10.0.2.2` 허용
- 개발 전용 health 진단: URL, HTTP status, mode, model loaded/version, fallback/error
- 긴 변 1280px 비율 유지와 JPEG quality 0.8
- camera/gallery 권한 분기와 갤러리 대안
- history 최대 20개, 원본 URI/binary 미저장
- Expo doctor와 mobile test 명령

## 실제 모델 모드 확인 대기

Android와 같은 LAN에서 다음 PowerShell 명령으로 health 응답 본문을 캡처해야 합니다.

```powershell
Invoke-RestMethod `
  http://<PC_LAN_IP>:8000/api/v1/health |
  ConvertTo-Json -Depth 5
```

확인 기준은 `modelLoaded=true`, `inferenceMode=model`, `fallbackReason=null`입니다. 이번 access log에는 응답 본문이 없으므로 아직 PASS로 표시하지 않습니다.

## 남은 Android 수동 QA

1. 카메라 촬영과 갤러리 선택을 각각 실행하고 입력 출처별 결과를 기록합니다.
2. 비행기 모드 또는 API 중지 상태에서 timeout/retry UX를 확인합니다.
3. 기록 저장 후 앱을 재시작해 history persistence를 확인합니다.
4. 결과·가이드 화면에서 Android system back 동작을 확인합니다.
5. 공개 API 배포 후 HTTPS와 production CORS를 LAN 결과와 분리해 검증합니다.
