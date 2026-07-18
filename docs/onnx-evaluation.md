# ONNX 실제 모델 검토

## 결론

**DEFER RUNTIME ADOPTION**

실제 `gcv2-mobilenetv3s-20260718-1529` 체크포인트를 opset 17로 export하고 ONNX checker 및 ONNX Runtime CPU parity를 통과했습니다. 이 Windows microbenchmark에서는 ONNX Runtime이 빨랐지만 Docker image, memory, 동시 부하와 운영 안정성을 검증하지 않았으므로 현재 FastAPI runtime은 PyTorch를 유지합니다.

## 실행 조건과 결과

- 입력: test split의 battery, glass, plastic fixture 각 1장
- output shape: dynamic batch × 10
- Top-1 match: 3/3
- Top-3 exact order match: 3/3
- max absolute logit error: `3.159046173095703e-05`
- max probability sum error: `5.960464477539063e-08`
- PyTorch artifact: 6,236,373 bytes
- ONNX artifact: 6,122,047 bytes

| CPU microbenchmark | Cold load | Warm median | Warm p95 | Samples |
|---|---:|---:|---:|---:|
| PyTorch | 53.41ms | 6.02ms | 11.60ms | 100 |
| ONNX Runtime | 36.48ms | 1.35ms | 1.88ms | 100 |

같은 process와 224×224 tensor를 사용한 단일 실행 결과이며 API serialization/upload, memory와 concurrency는 포함하지 않습니다. 원본 machine-readable 결과는 `docs/model-results/onnx-evaluation.json`입니다.

## 재현

```powershell
cd ml
uv sync --frozen --extra onnx
uv run python export_onnx.py `
  --model ../apps/api/models/garbage_classifier.pt `
  --metadata ../apps/api/models/metadata.json `
  --output ../apps/api/models/garbage_classifier.onnx `
  --opset 17
uv run python onnx_evaluate.py `
  --model ../apps/api/models/garbage_classifier.pt `
  --metadata ../apps/api/models/metadata.json `
  --onnx ../apps/api/models/garbage_classifier.onnx `
  --fixture ../dataset/archive/original/battery/battery_108.jpg `
  --fixture ../dataset/archive/original/glass/glass_1001.jpg `
  --fixture ../dataset/archive/original/plastic/plastic_1023.jpg `
  --warmup 10 --samples 100 `
  --report ../docs/model-results/onnx-evaluation.json
```

ONNX binary는 Git 제외 대상입니다. runtime 전환은 Docker image/peak memory/동시 요청 benchmark와 predictor integration test를 별도 변경으로 통과한 뒤 결정합니다.
