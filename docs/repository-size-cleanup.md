# 저장소 용량과 dataset 정리 계획

## 현재 감사 결과

- `git ls-files dataset`: 12,259개 tracked 파일
- GitHub API repository size: 506,551 KiB (2026-07-19 조회)
- local `git count-objects -vH`: pack 1.54 GiB, garbage 51.66 MiB
- 원인: 원본 dataset이 기존 commit history에 포함됨
- 현재 정책: `/dataset/`, `/artifacts/model/`, `/dist/`, model binary는 신규 Git 추적 차단

`.gitignore`만으로 이미 tracked인 파일이나 과거 object는 제거되지 않습니다. 이번 작업에서는 로컬 dataset 삭제, index 제거, history rewrite, force push, LFS migration을 수행하지 않았습니다.

## Tip cleanup — 승인 후

로컬 dataset을 보존하면서 다음 commit부터 추적만 중단하려면 먼저 독립 backup과 팀 합의를 확보한 뒤 실행합니다.

```powershell
git status --short
git rm -r --cached dataset
git commit -m "chore(repo): stop tracking local training dataset"
```

이 작업은 과거 clone 크기를 줄이지 않습니다. 삭제 대상이 정확히 `dataset/`인지 `git diff --cached --stat`로 확인해야 합니다.

## History cleanup — 별도 maintenance window

1. 원격 repository, branch, tag, release를 별도 위치에 mirror backup합니다.
2. 모든 collaborator에게 rewrite 시각과 freeze window를 공지합니다.
3. fresh mirror clone에서 `git filter-repo --path dataset --invert-paths`를 실행합니다.
4. refs와 artifact 링크를 검증하고 보호 branch의 force update를 명시적으로 승인받습니다.
5. tag/release가 사라지거나 commit SHA가 바뀌는 영향을 확인합니다.
6. 기존 clone은 merge/pull하지 않고 fresh clone하도록 안내합니다.

예시 명령은 파괴적이므로 문서용이며 자동 실행하지 않습니다.

```bash
git clone --mirror https://github.com/whitespaca/hanyang-hackaton.git backup.git
git clone https://github.com/whitespaca/hanyang-hackaton.git cleanup
cd cleanup
git filter-repo --path dataset --invert-paths
# 검증 및 명시적 승인 후에만 force push
```

## 라이선스 위험

현재 Kaggle 페이지는 dataset license를 MIT로 표시하지만, 공개 repository에는 별도 project `LICENSE`가 없고 원본 이미지별 권리·재배포 범위는 추가 검토가 필요합니다. 안전한 기본값은 dataset 원본을 공개 Git/Release/model package에 포함하지 않고 source attribution과 재현 다운로드 절차만 제공하는 것입니다.
