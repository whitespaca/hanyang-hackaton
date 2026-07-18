# 실제 모델 평가

## 상태

**NOT RUN**

Reason: 2026-07-18 현재 checkout에 Kaggle Garbage Classification V2 dataset, `GARBAGE_DATASET_DIR`, 실제 checkpoint가 없습니다. 임의 지표를 생성하지 않았습니다.

## 실행 정보

- 기준 commit: `bbb1fc80d9da29f6b4f8d7e4ca7b1180b282f172` + 현재 uncommitted P1/P2 변경
- dataset source: Kaggle `sumn2u/garbage-classification-v2`
- 실제 클래스 분포: NOT RUN
- split: dataset이 pre-split이면 train/validation/test를 유지, 단일 root면 seed 42로 stratified 80/10/10
- model: MobileNetV3 Small, ImageNet pretrained
- class imbalance: weighted cross entropy만 사용
- selection: best validation Macro F1
- head/fine-tune: 4 / 3 epochs 기본

## Test metrics

| Metric | Result |
|---|---|
| Loss | NOT RUN |
| Accuracy | NOT RUN |
| Macro F1 | NOT RUN |
| Weighted F1 | NOT RUN |
| Top-3 Accuracy | NOT RUN |
| Low-confidence rate | NOT RUN |
| Per-class report | NOT RUN |
| Confusion matrix | NOT RUN |
| CPU latency | NOT RUN |

## 스마트폰 사진 평가

NOT RUN — 물리 기기와 실제 model artifact가 없습니다. 배경, 조명, 투명·반사 재질, 오염, 복합 포장에 대한 대표 스마트폰 fixture를 별도로 수집해 평가해야 합니다. 사용자 사진 원본은 저장소에 커밋하지 않습니다.

## 준비된 명령

```powershell
cd ml
uv run python preflight.py --data-dir C:/absolute/path/to/garbage-classification-v2 --check-corrupt
uv run python train.py `
  --data-dir C:/absolute/path/to/garbage-classification-v2 `
  --output-dir ../apps/api/models `
  --epochs-head 4 `
  --epochs-finetune 3 `
  --batch-size 32 `
  --device cuda `
  --seed 42 `
  --check-corrupt
cd ..
pnpm test:model:actual
```

`--data-dir`이 없으면 `GARBAGE_DATASET_DIR`을 사용하며 CLI가 우선합니다. 폴더 이름은 대소문자를 정규화하고 누락·빈 class·예상 밖 class·중복 normalization을 오류로 처리합니다.

`--device cuda`는 CUDA PyTorch와 NVIDIA GPU가 확인되지 않으면 dataset scan 전에 실패합니다. 실행 시 출력되는 `trainingRuntime`과 산출물의 `training-config.json`에 실제 device, GPU 이름, PyTorch/CUDA build, AMP 사용 여부를 기록합니다.

Windows에서는 multiprocessing spawn이 worker마다 PyTorch CUDA DLL을 로드해 page file 부족(`WinError 1455`)을 일으킬 수 있으므로 기본 `numWorkers`는 0입니다. Linux/macOS 기본값은 최대 4이며, 실제 사용값은 `trainingRuntime`과 `training-config.json`에 기록합니다.

## Artifact 계약

```text
artifacts/model/gcv2-mobilenetv3s-YYYYMMDD-HHMM/
  garbage_classifier.pt
  metadata.json
  metrics.json
  dataset-manifest.json
  training-config.json
  training-history.json
  classification-report.json
  confusion-matrix.csv
  confusion-matrix.png
  class-distribution.json
  README.md
```

manifest에는 dataset root 기준 상대경로만 기록됩니다. runtime `.pt`와 metadata는 `apps/api/models/`에 복사되며 binary는 Git ignore 대상입니다. 커밋 가능한 지표·report·그림은 실제 학습 때만 `docs/model-results/`에 생성합니다.

## 알려진 한계

- 실제 dataset의 class count와 품질은 아직 확인하지 않았습니다.
- pretrained weight 첫 다운로드와 실제 학습 compute가 필요합니다.
- temporary state dict load test는 정확도를 증명하지 않습니다.
- API와 evaluation은 Resize(256) + CenterCrop(224) + ImageNet normalization으로 정렬했습니다.
