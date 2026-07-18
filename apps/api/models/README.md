# 모델 artifact

실제 모델 모드는 `garbage_classifier.pt`와 `metadata.json`을 읽습니다. 두 파일은 학습 산출물이므로 Git에서 제외됩니다. 형식은 `metadata.example.json`을 참고하세요. 개발 환경의 `INFERENCE_MODE=model`에서 파일이 없으면 경고 사유를 health에 노출하고 mock으로 전환하지만, production에서는 시작에 실패합니다.
