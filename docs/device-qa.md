# 모바일 실제 기기 QA

## 준비

1. PC와 휴대폰을 같은 Wi-Fi에 연결합니다.
2. `ipconfig`에서 PC의 IPv4 주소를 확인합니다.
3. `apps/mobile/.env`의 `EXPO_PUBLIC_API_BASE_URL`을 `http://<PC-LAN-IP>:8000`으로 설정합니다.
4. `pnpm dev:api`와 `pnpm dev:mobile`을 실행합니다.
5. Windows 방화벽에서 Python/FastAPI의 private network 8000 포트 접근을 허용합니다.

## 필수 체크리스트

- [ ] 첫 진입에서 카메라 권한 허용 후 촬영 가능
- [ ] 권한 거절 상태에서 재요청 또는 갤러리 대안 표시
- [ ] 갤러리 선택 취소 시 화면과 flow state 유지
- [ ] 촬영·갤러리 이미지가 preview에서 원본 비율로 표시
- [ ] 분석 전에 긴 변 약 1280px, JPEG quality 0.8로 변환
- [ ] 실제 기기에서 API Top 3 응답 수신
- [ ] 네트워크 중단 시 한국어 오류와 재시도 표시
- [ ] 클래스 수정, 세부 품목, 체크리스트 완료 가능
- [ ] 최근 기록이 앱 재시작 후 유지되고 20개로 제한
- [ ] 원본 이미지 URI 또는 binary가 AsyncStorage에 저장되지 않음
- [ ] Android back 동작으로 flow가 비정상 종료되지 않음

결과는 기기 모델, OS, Expo Go 버전, API 주소, 성공/실패와 재현 절차를 함께 기록합니다.
