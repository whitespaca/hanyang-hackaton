# API 계약

Base URL: `http://localhost:8000/api/v1`. 모든 응답은 `X-Request-ID` 헤더를 포함합니다.

## Endpoint

- `GET /health`: 서비스와 predictor 상태. `modelLoaded`, `modelVersion`, `inferenceMode`, 선택적 `fallbackReason` 반환
- `POST /classifications`: multipart `image` 필수, `client=web|mobile` 선택. JPG/PNG/WebP, 최대 8 MiB, 최소 32×32. Top 3와 threshold 반환
- `GET /guides`: 전체 카테고리와 세부 가이드
- `GET /guides/{category}`: 한 카테고리
- `GET /guides/{category}/{subcategory}`: 체크리스트 상세
- `GET /items`: 전체 품목 summary. data order를 안정적으로 유지하고 `popular` 포함
- `GET /items/search?q={query}&limit={1..20}`: 이름·alias·keyword 직접 결과와 별도 fuzzy 제안. 기본 limit 8
- `GET /items/{item_id}`: 이유·지역 안내·출처를 포함한 품목 상세
- `POST /classifications/{id}/feedback`: 익명 확인/수정 저장, 성공 201
- `GET /statistics/summary`: 총 분류, 평균 confidence, 수정률, 카테고리 수, `demo|live`

```bash
curl http://localhost:8000/api/v1/health
curl -F "image=@fixture.png;type=image/png" -F "client=web" http://localhost:8000/api/v1/classifications
curl http://localhost:8000/api/v1/guides/plastic/pet-bottle
curl http://localhost:8000/api/v1/items
curl "http://localhost:8000/api/v1/items/search?q=휴대용%20배터리&limit=8"
curl http://localhost:8000/api/v1/items/power-bank
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

품목 상세는 `id`, `nameKo`, `aliases`, `keywords`, nullable `classificationCategory`, 그룹, 재활용 구분, 요약, 단계, 주의사항, 이유, 배출 장소 유형, 지역 안내, 출처와 확인일을 반환합니다. 기존 `/guides` 상세는 호환 필드를 additive projection으로 더하며 같은 상세 내용을 사용합니다.
