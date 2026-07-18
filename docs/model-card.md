# 분리샷 모델 카드

## 개요

- 데이터셋: Kaggle Garbage Classification V2
- 클래스: metal, glass, biological, paper, battery, trash, cardboard, shoes, clothes, plastic
- 아키텍처: MobileNetV3 Small transfer learning
- 입력: EXIF 보정 RGB, 224×224, ImageNet normalization
- 학습 날짜/실행 ID: TBD
- artifact 통합 상태: 임시 미학습 state dict로 API load/forward smoke 검증 완료, 실제 학습 checkpoint는 TBD

## 평가

실제 데이터셋 checkpoint가 이 저장소에 없으므로 accuracy, macro F1, Top-3 accuracy, 클래스별 지표는 모두 **TBD**입니다. 측정되지 않은 수치를 발표에 사용하지 않습니다. `ml/evaluate.py`의 test split 결과만 기록합니다.

`pnpm test:model`의 성공은 serialization과 추론 코드 경로가 동작한다는 뜻일 뿐 모델 정확도를 의미하지 않습니다.

## 의도된 사용

일상 폐기물 한 개의 대분류 후보를 제시해 사용자가 분리배출 가이드로 빠르게 이동하도록 돕는 용도입니다. 안전·법적 판단, 유해물질 식별, 여러 물체 탐지에는 사용하지 않습니다.

## 한계

배경, 조명, 오염, 투명/반사 재질, 복합 포장과 학습 데이터 domain shift에 취약할 수 있습니다. 지역별 규정을 알지 못하며 실제 재질을 화학적으로 판별하지 않습니다. 모든 결과에 Top 3·confidence·수정 경로를 제공합니다.

## 개인정보

API는 원본 이미지를 추론 메모리에서만 사용하고 저장하지 않습니다. 분류 ID, client, Top 1, confidence, 모델 버전과 명시적 피드백만 익명 집계합니다.
