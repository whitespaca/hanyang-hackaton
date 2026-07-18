# API 계약

Base URL: `http://localhost:8000/api/v1`. 모든 응답은 `X-Request-ID` 헤더를 포함합니다.

## Endpoint

- `GET /health`: 서비스와 predictor 상태. `modelLoaded`, `modelVersion`, `inferenceMode`, 선택적 `fallbackReason` 반환
- `POST /classifications`: multipart `image` 필수, `client=web|mobile` 선택. JPG/PNG/WebP, 최대 8 MiB, 최소 32×32. Top 3와 threshold 반환
- `GET /guides`: 전체 카테고리와 세부 가이드
- `GET /guides/{category}`: 한 카테고리
- `GET /guides/{category}/{subcategory}`: 체크리스트 상세
- `POST /classifications/{id}/feedback`: 익명 확인/수정 저장, 성공 201
- `GET /statistics/summary`: 총 분류, 평균 confidence, 수정률, 카테고리 수, `demo|live`

```bash
curl http://localhost:8000/api/v1/health
curl -F "image=@fixture.png;type=image/png" -F "client=web" http://localhost:8000/api/v1/classifications
curl http://localhost:8000/api/v1/guides/plastic/pet-bottle
curl -X POST -H "Content-Type: application/json" -d '{"predictedClass":"glass","selectedClass":"plastic","subcategory":"plastic-container","reason":"user_correction"}' http://localhost:8000/api/v1/classifications/CLASSIFICATION_ID/feedback
```

분류 성공 예:

```json
{"classificationId":"uuid","predictions":[{"className":"plastic","labelKo":"플라스틱","confidence":0.7812}],"needsConfirmation":false,"confidenceThreshold":0.65,"model":{"name":"deterministic_mock","version":"mock-gcv2-001","inferenceMode":"mock"}}
```

오류 형식:

```json
{"error":{"code":"INVALID_IMAGE","message":"이미지를 읽을 수 없습니다.","requestId":"uuid","details":null}}
```

주요 코드와 상태는 `UNSUPPORTED_MEDIA_TYPE`(415), `FILE_TOO_LARGE`(413), `INVALID_IMAGE`/`IMAGE_TOO_SMALL`/`VALIDATION_ERROR`(422), `NOT_FOUND`(404), `PREDICTION_MISMATCH`(400), `FEEDBACK_EXISTS`(409)입니다.
