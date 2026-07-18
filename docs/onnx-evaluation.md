# ONNX 검토

## 결론

**DEFER RUNTIME ADOPTION**

ONNX export/checker/runtime parity 코드는 준비했고 미학습 임시 MobileNetV3 state dict의 smoke test는 통과했습니다. 실제 checkpoint와 대표 이미지가 없으므로 실제 artifact size, cold load, warm p50/p95, memory, Docker image 영향을 비교하지 않았습니다. ONNX가 더 빠르다고 결론 내리지 않습니다.

## 구현

```text
PyTorch state dict + metadata
→ ml/export_onnx.py (opset 17)
→ ONNX checker
→ ml/onnx_evaluate.py
→ output shape / Top-1 / Top-3 exact order / max logit error / probability sum
→ artifact bytes / cold load / warm median,p95
```

선택 의존성은 `uv sync --extra onnx`로 설치합니다. API runtime과 기본 ML smoke에는 추가되지 않습니다.

## 실행 결과

| 항목 | 결과 |
|---|---|
| Temporary model export | PASS |
| ONNX checker | PASS |
| ONNX Runtime load | PASS |
| Temporary Top-1 parity | PASS |
| Temporary Top-3 exact order parity | PASS |
| Temporary max logit error threshold `<1e-4` | PASS |
| Actual trained checkpoint | NOT RUN |
| Real fixture 3+ images | NOT RUN |
| Actual latency/size/memory comparison | NOT RUN |
| Docker image comparison | NOT RUN |

임시 smoke는 runtime 경로가 동작함을 뜻할 뿐 실제 정확도나 속도 우위를 뜻하지 않습니다.

## 실제 평가 명령

```powershell
cd ml
uv sync --extra onnx
uv run python export_onnx.py `
  --model ../apps/api/models/garbage_classifier.pt `
  --metadata ../apps/api/models/metadata.json `
  --output ../apps/api/models/garbage_classifier.onnx `
  --opset 17
uv run python onnx_evaluate.py `
  --model ../apps/api/models/garbage_classifier.pt `
  --metadata ../apps/api/models/metadata.json `
  --onnx ../apps/api/models/garbage_classifier.onnx `
  --fixture C:/fixtures/metal.jpg `
  --fixture C:/fixtures/glass.jpg `
  --fixture C:/fixtures/plastic.jpg `
  --report ../artifacts/onnx-evaluation.json
```

fixture를 제공하면 최소 3장을 강제합니다. fixture가 없는 호출은 CI/tooling용 seeded synthetic tensor 3개를 사용하고 `inputMode=synthetic`으로 표시합니다.

## 채택 기준

실제 PyTorch CPU p95, memory 또는 container size 문제가 관찰되고 ONNX가 동일 Top-3 계약을 유지하면서 의미 있게 개선할 때만 API predictor 전환을 별도 변경으로 검토합니다. 현재는 PyTorch를 유지합니다.
