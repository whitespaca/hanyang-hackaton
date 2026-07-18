# 분리샷 v0.1.0 릴리스 노트

## 개요

분리샷은 사진에서 쓰레기 대분류 Top-3를 제안하고 사용자가 확인·수정한 뒤 한국형 분리배출 체크리스트를 제공하는 Web/Expo/FastAPI 서비스입니다.

## 주요 기능

- Next.js drag-and-drop 분류, 저신뢰도/오류/재시도, 가이드와 통계
- Expo camera/gallery, 1280px JPEG 전처리, 결과 수정, 최대 20개 image-free history
- FastAPI image 검증, request ID, exact-origin CORS, anonymous SQLite feedback/statistics
- deterministic mock demo와 production fail-fast actual model mode
- Playwright mock 8개 흐름과 실제 모델 optional smoke
- model release ZIP, SHA-256 manifest, ONNX parity tooling

## ML

- model version: `gcv2-mobilenetv3s-20260718-1529`
- test samples: 1,227
- Accuracy: 0.9087204564
- Macro F1: 0.9037076373
- Weighted F1: 0.9087555381
- Top-3 Accuracy: 0.9820700896

## 지원·배포 상태

- Web local: PASS
- API local actual model: PASS
- Mobile automated tests: PASS
- Android physical device: NOT RUN
- iOS physical device: NOT RUN
- public API URL: NOT DEPLOYED
- public Web URL: NOT DEPLOYED
- model release asset: local package only, NOT PUBLISHED

## 개인정보와 제한

원본 이미지는 disk/DB/history에 저장하지 않습니다. 모델은 한 이미지의 대표 물체 하나만 10개 class로 분류하며 스마트폰 현장 사진 평가는 아직 실행하지 않았습니다. AI 결과와 지역별 배출 규정은 사용자가 최종 확인해야 합니다.

## Rollback

API/Web image digest와 matching model/metadata checksum을 함께 versioning합니다. Smoke 실패 시 직전 image로 traffic을 복구하고 model 문제는 `.pt`와 metadata를 함께 원자적으로 되돌립니다. SQLite persistent volume은 삭제하지 않습니다.
