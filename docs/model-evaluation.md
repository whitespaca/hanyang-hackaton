# 실제 모델 평가

## 학습과 artifact

- 학습 날짜/run: 2026-07-18 / `gcv2-mobilenetv3s-20260718-1529`
- source commit: 실제 ML 결과 commit `548cbaece09c18c590d0c47659d0b139a2fc0a4b`
- dataset: Kaggle `sumn2u/garbage-classification-v2`의 로컬 snapshot
- dataset layout: 단일 class root에서 seed 42 stratified 80/10/10
- split: train 9,805 / validation 1,227 / test 1,227, 총 12,259
- architecture: MobileNetV3 Small, ImageNet pretrained, input 224×224
- training: head 4 epochs (`1e-3`) + fine-tune 3 epochs (`1e-4`), AdamW, weight decay `1e-4`
- imbalance: weighted cross entropy, `N / (class_count × class_count_total)` 방식
- selection: best validation Macro F1
- device: NVIDIA GeForce RTX 4060 Ti, PyTorch `2.13.0+cu130`, CUDA 13.0, AMP 사용, DataLoader workers 0
- runtime model SHA-256: `8828193dfddc7b2c32f4a0c88b288e56659af6bf13047026e9ae06468590ec71`

## Test 결과

| Metric | Result |
|---|---:|
| Samples | 1,227 |
| Loss | 0.2763821185 |
| Accuracy | 0.9087204564 |
| Macro F1 | 0.9037076373 |
| Weighted F1 | 0.9087555381 |
| Top-3 Accuracy | 0.9820700896 |
| Low-confidence rate (`<0.65`) | 0.0904645477 |

| Class | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| metal | 0.8019 | 0.9140 | 0.8543 | 93 |
| glass | 0.8824 | 0.8621 | 0.8721 | 174 |
| biological | 0.8947 | 0.9714 | 0.9315 | 70 |
| paper | 0.8978 | 0.9179 | 0.9077 | 134 |
| battery | 0.9375 | 0.9868 | 0.9615 | 76 |
| trash | 0.7800 | 0.8667 | 0.8211 | 45 |
| cardboard | 0.9318 | 0.8723 | 0.9011 | 141 |
| shoes | 0.9459 | 0.9655 | 0.9556 | 145 |
| clothes | 0.9891 | 0.9577 | 0.9731 | 189 |
| plastic | 0.9034 | 0.8188 | 0.8590 | 160 |

Confusion matrix의 각 row 합, classification report support, test class distribution은 모두 1,227로 일치합니다. 가장 큰 방향성 혼동은 plastic→glass 11건, glass→metal 12건, cardboard→paper 8건입니다. `trash`는 support가 45로 가장 작고 precision 0.78이므로 실제 사진에서 특히 사용자 확인이 중요합니다.

원본 값은 `docs/model-results/metrics.json`, `classification-report.json`, `class-distribution.json`, `confusion-matrix.png`에 보존합니다.

## API와 Web 통합

- `test:model:actual`: PASS, 실제 metadata/state dict, output dimension 10, health, Top-3 정렬·범위, fallback 없음
- production-like health: `modelLoaded=true`, version 일치, `inferenceMode=model`, `fallbackReason=null`
- 실제 test fixture classification: HTTP 200, Top-1 `battery` 0.9962, Top-3 정렬, classification ID 존재
- startup: 5,128.3ms
- first API inference: 76.9ms
- warm API inference 10회: p50 30.4ms, p95 35.1ms
- 실제 모델 Web Playwright: PASS, Top-3→확인→세부 품목→가이드→feedback→초기화

위 latency는 Windows 로컬 HTTP 경로의 단일 측정이며 운영 SLA나 다른 hardware 성능을 의미하지 않습니다. process memory와 Docker image 크기는 측정하지 않았습니다.

## 스마트폰 사진 평가

**NOT RUN — physical Android/iOS devices and separate smartphone fixtures unavailable.** Test split 성능은 촬영 조명, 배경, 반사, 오염, 복합재질에 대한 현장 정확도를 보장하지 않습니다.

## 재현 명령

```powershell
cd ml
uv run python preflight.py --data-dir C:/absolute/path/to/garbage-classification-v2 --check-corrupt
uv run python train.py `
  --data-dir C:/absolute/path/to/garbage-classification-v2 `
  --output-dir ../apps/api/models `
  --epochs-head 4 --epochs-finetune 3 --batch-size 32 `
  --device cuda --seed 42 --check-corrupt
cd ..
pnpm test:model:actual
pnpm test:e2e:model
```

Dataset과 model binary는 Git에 커밋하지 않습니다. 모델은 matching metadata와 함께 배포해야 하며 production model mode는 불일치 시 fail-fast합니다.
