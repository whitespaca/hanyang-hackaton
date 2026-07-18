# 분리샷 ML 파이프라인

기본 데이터셋은 [Kaggle Garbage Classification V2](https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2)입니다. 데이터셋 라이선스와 다운로드 조건은 Kaggle 원문을 확인하세요. 이미지·checkpoint·학습 run은 용량과 라이선스 때문에 Git에 넣지 않습니다.

## 예상 구조

`data-dir` 바로 아래에 10개 클래스 폴더가 있거나, `train`, `val`(또는 `validation`), `test` 아래에 각각 10개 클래스 폴더가 있어야 합니다. 폴더 이름은 `metal, glass, biological, paper, battery, trash, cardboard, shoes, clothes, plastic`과 정확히 일치해야 합니다.

## 설치와 학습

```bash
cd ml
uv sync
uv run python train.py --data-dir C:/absolute/path/to/garbage-classification-v2 --output-dir ../apps/api/models --epochs-head 4 --epochs-finetune 3 --batch-size 32 --seed 42 --check-corrupt
```

CUDA가 있으면 GPU를, 없으면 CPU를 사용합니다. CPU 학습은 수 시간 이상 걸릴 수 있습니다. 결과는 state dict, metadata, metrics JSON이며 실제 수치는 `metrics.json`을 생성한 뒤에만 발표 자료에 사용하세요.

데이터 없이 모델 생성/한 배치 forward와 metadata 계약만 확인하려면 `uv run pytest tests/test_smoke.py`를 실행합니다. smoke test는 `weights=None`을 사용하므로 ImageNet 사전학습 weight나 네트워크가 필요하지 않습니다. 실제 학습의 최초 실행에서만 pretrained weight 다운로드가 필요합니다.

API predictor까지 포함한 artifact round-trip은 루트에서 `pnpm test:model`로 검증합니다. 이 검사는 임시 state dict를 만들고 `TorchPredictor`가 metadata 클래스 순서, 입력 전처리와 Top 3를 정상 처리하는지 확인합니다.
