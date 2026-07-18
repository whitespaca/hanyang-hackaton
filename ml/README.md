# 분리샷 ML 파이프라인

데이터셋은 [Kaggle Garbage Classification V2](https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2)입니다. Kaggle 원문의 license/download 조건을 확인하세요. dataset, checkpoint, ONNX binary와 training run은 용량·license 때문에 Git에 넣지 않습니다.

## Dataset layout

대소문자 변형을 허용합니다.

```text
root/train/<class>
root/validation/<class>
root/test/<class>
```

또는 단일 root:

```text
root/Metal
root/Glass
...
root/Plastic
```

단일 root는 seed 42 기준 stratified 80/10/10으로 나눕니다. 누락·빈 class·예상 밖 class·중복 normalization은 오류이며 manifest에는 dataset root 기준 상대경로만 씁니다.

Kaggle credential이 이미 구성되지 않았다면 자동 다운로드하지 않습니다. dataset 경로는 `--data-dir`이 `GARBAGE_DATASET_DIR`보다 우선합니다.

## Preflight

```powershell
cd ml
uv sync
uv run python preflight.py --data-dir C:/absolute/path/to/garbage-classification-v2 --check-corrupt
```

layout, 실제 class/split count, corrupt 상대경로, duplicate hash 경고와 재현 manifest를 JSON으로 출력합니다. `--manifest-out`으로 파일을 저장할 수 있습니다.

## Training

```powershell
uv run python train.py `
  --data-dir C:/absolute/path/to/garbage-classification-v2 `
  --output-dir ../apps/api/models `
  --epochs-head 4 `
  --epochs-finetune 3 `
  --batch-size 32 `
  --device cuda `
  --seed 42 `
  --check-corrupt
```

- MobileNetV3 Small + ImageNet weights
- head 4 epochs, 마지막 feature blocks 일부 fine-tune 3 epochs
- AdamW, weighted cross entropy 하나만 사용
- best validation Macro F1 checkpoint
- test loss/accuracy/Macro F1/Weighted F1/Top-3/low-confidence/per-class/confusion matrix
- train augmentation과 deterministic evaluation transform 분리
- API/evaluation: Resize(256), CenterCrop(224), ImageNet normalization

Windows/Linux의 `uv sync`는 공식 PyTorch CUDA 13.0 wheel을 설치합니다. `--device cuda`는 CUDA를 사용할 수 없을 때 데이터 검사 전에 즉시 실패하므로 GPU 학습을 확실히 요구할 때 사용하세요. 기본값 `--device auto`는 CUDA를 우선하고, CUDA가 없으면 경고 후 CPU를 사용합니다. CUDA에서는 AMP, pinned memory, 비동기 전송을 사용합니다. Windows는 worker 프로세스마다 PyTorch CUDA DLL을 다시 로드해 `WinError 1455`가 발생할 수 있어 `--num-workers 0`이 기본이고, Linux/macOS는 최대 4개가 기본입니다. 충분한 page file을 별도로 구성한 Windows에서만 worker 수를 명시적으로 늘리세요. `--no-amp`로 AMP도 끌 수 있습니다.

설치 및 GPU 확인:

```powershell
uv sync
uv run python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

CPU 학습은 수 시간 이상 걸릴 수 있고 첫 실제 학습은 pretrained weight 다운로드가 필요합니다.

산출물은 `artifacts/model/<run-id>/`에 versioned 보존하고 runtime `.pt`/metadata를 `apps/api/models/`에 복사합니다. 실제 평가 결과만 `docs/model-results/`에 복사합니다.

## Smoke/model contract

```powershell
uv run pytest
cd ..
pnpm test:model
pnpm test:model:actual
```

기본 smoke는 `weights=None`이므로 dataset이나 pretrained download가 필요 없습니다. `test:model`은 temporary artifact, `test:model:actual`은 실제 artifact를 검사하며 없으면 `SKIP`합니다.

## ONNX optional review

```powershell
uv sync --extra onnx
uv run pytest tests/test_onnx.py
```

실제 명령은 [ONNX 평가 문서](../docs/onnx-evaluation.md)를 참고하세요. ONNX는 현재 API runtime이 아니며 실제 benchmark 전에는 성능 우위를 주장하지 않습니다.
