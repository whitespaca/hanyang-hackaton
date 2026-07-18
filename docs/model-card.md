# 분리샷 모델 카드

## 개요

- model: MobileNetV3 Small transfer learning
- version: `gcv2-mobilenetv3s-20260718-1529`
- dataset: Kaggle Garbage Classification V2의 로컬 12,259-image snapshot
- classes: metal, glass, biological, paper, battery, trash, cardboard, shoes, clothes, plastic
- input: EXIF 보정 RGB, 224×224 deterministic resize/center crop, ImageNet normalization
- output: metadata class order의 softmax Top-3
- runtime SHA-256: `8828193dfddc7b2c32f4a0c88b288e56659af6bf13047026e9ae06468590ec71`

## 평가

Seed 42 stratified split의 test 1,227장에서 Accuracy 0.9087, Macro F1 0.9037, Weighted F1 0.9088, Top-3 Accuracy 0.9821을 기록했습니다. confidence 0.65 미만 비율은 0.0905입니다. 세부 지표와 혼동 분석은 [실제 모델 평가](model-evaluation.md)에 있습니다.

이 결과는 같은 dataset source의 holdout split 측정입니다. 별도 스마트폰 촬영 사진 평가는 **NOT RUN**이며 현장 일반화를 증명하지 않습니다.

## 의도된 사용

한 이미지의 대표 쓰레기 물체를 10개 대분류 후보로 좁혀 사용자가 확인·수정한 뒤 배출 가이드로 이동하도록 돕습니다. 안전·법적 판단, 유해물질 식별, 여러 물체 탐지, 지역별 규정의 자동 확정에는 사용하지 않습니다.

## 한계와 완화

배경, 조명, 반사, 오염, 복합재질, 절단된 물체와 domain shift에 취약할 수 있습니다. 특히 plastic/glass, glass/metal, cardboard/paper 혼동이 test set에서 관찰됐습니다. UI는 Top-3와 confidence를 표시하고 모든 결과에 사용자 확인·수정 경로를 제공합니다. 배출 기준은 지역별로 다시 확인해야 합니다.

## 개인정보

API는 원본 이미지를 추론 메모리에서만 사용하고 disk/DB에 저장하지 않습니다. SQLite에는 익명 classification/feedback 최소 정보만 저장하며 Mobile history에도 image binary와 URI를 저장하지 않습니다.

## 배포

Model binary는 일반 Git에서 제외합니다. matching metadata와 SHA-256 release package를 read-only model volume 또는 검증된 artifact 전달 경로로 배포합니다. Production model mode는 누락·불일치·dependency 오류에서 fail-fast하며 mock fallback을 허용하지 않습니다.
