# SCIS Lab 홈페이지 — Claude 작업 노트

경북대 SCIS Lab(서동준 교수) 홈페이지입니다. 집 Mac Studio, 학교 MacBook Pro, 클라우드 세션(claude.ai/code)에서 번갈아 작업하므로, 세션을 시작하면 이 파일을 먼저 읽고 마칠 때 "작업 기록"과 "남은 일"을 갱신합니다.

- 답과 문서는 한국어로 씁니다. 커밋 메시지는 기존처럼 영어로 씁니다.
- 공개 사이트입니다. `main`에 push하면 1~2분 뒤 https://knuscislab.github.io 에 반영됩니다.
- 비밀번호, 토큰, `ANALYTICS_KEY` 값은 어떤 파일에도 적지 않습니다.

## 구조

- 내용: `data/`의 JSON (논문, 소식, 사람 등 한 항목이 한 파일). `node scripts/build.mjs`가 합쳐서 `_site/`를 만듭니다.
- 화면: `*.html` + `assets/js/app.js`, `assets/js/i18n.js` (영어/한국어)
- 배포: `.github/workflows/deploy.yml` (push마다 GitHub Pages로 배포)
- 미리보기: `node scripts/build.mjs && cd _site && python3 -m http.server`
- 관리 화면 두 가지, 같은 데이터를 고칩니다. 입력칸을 바꿀 때는 둘 다 고칩니다.
  - Sveltia CMS: https://knuscislab.github.io/admin/ (`admin/config.yml`, GitHub 토큰으로 로그인)
  - Pages CMS: https://app.pagescms.org (`.pages.yml`, GitHub 로그인)
- 방문 통계: `assets/js/track.js` → Cloudflare Worker(`analytics/`, `.github/workflows/analytics.yml`로 배포) → 대시보드 `stats.html`
- 사람용 안내: `docs/가이드_1_배포하기.md`, `docs/가이드_2_관리하기.md`, `docs/가이드_3_방문통계.md`

## 어디서 무엇을 하나

- 클라우드 세션: 코드와 내용 수정, 커밋, push, PR
- Mac의 Code 탭에서만: Chrome이 필요한 일(GitHub 설정, 시크릿, 토큰, CMS 로그인), Google Drive 파일 작업

## 작업 기록

- 2026-10-18 (집): Mac 재설치로 예전 Claude Code 기록이 사라짐. `ANALYTICS_KEY`를 새로 정해 통계 서버를 다시 배포함. 가이드 3에 "키를 잊어버렸을 때" 추가. gh 로그인(KNUSCISLAB), Sveltia CMS 토큰 재발급.

## 남은 일

- [ ] 학생들을 각자 GitHub 계정으로 협업자 초대 (아이디 받기). 학생용 안내 문서 수정: Sveltia CMS는 학생 계정의 classic 토큰(`repo` 권한)이 필요
- [ ] 초대 뒤 KNUSCISLAB 비밀번호 변경, 2단계 인증 켜기 (교수님이 직접)
- [ ] 학교 MacBook Pro에서 `gh auth login`
