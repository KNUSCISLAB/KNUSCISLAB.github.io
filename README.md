# SCIS Lab website

Smart Control & Intelligent Systems Lab, Kyungpook National University.
Live site: https://knuscislab.github.io

- 내용 수정: https://app.pagescms.org (관리 화면)
- 배포 방법: `docs/가이드_1_배포하기.md`
- 관리 방법: `docs/가이드_2_관리하기.md`

## How it works

- Content lives in `data/` as JSON. Each paper, news item, and person is one file, edited in Pages CMS (`.pages.yml`).
- On every push, `.github/workflows/deploy.yml` runs `node scripts/build.mjs`, which merges the files into `_site/data/*.json` and deploys `_site/` to GitHub Pages.
- Pages (`*.html`) load the merged JSON and render in English or Korean (`assets/js/app.js`, `assets/js/i18n.js`).
- Local preview: `node scripts/build.mjs && cd _site && python3 -m http.server`
