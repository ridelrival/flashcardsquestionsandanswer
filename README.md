# 飲食料品製造業 · 特定技能1号 379問

Offline-first study PWA based on the 379 master questions in
`飲食料品製造業_特定技能1号_379問_本試験形式予想問題集.pdf`.
The five mock exams printed after the master questions are not imported as extra questions.

## Contents

- 379 questions with three choices and one correct answer each
- 71 image questions using 24 local JPEG assets
- Seven PDF sections, including practical judgment and planning questions
- Immediate study feedback, wrong-answer review, unanswered filter, bookmarks, random order, optional choice shuffle
- 40-question, 70-minute timed exam with 25 food theory, 5 labor theory, 6 food practical, 4 labor practical questions
- Local exam history, statistics, and JSON export/import
- IndexedDB state and a service worker that pre-caches every question image

No account or cloud database is used. Progress is stored in this browser's IndexedDB and survives app updates. Keep JSON backups before clearing site data or changing devices. The previous flashcard app's `localStorage` keys are left untouched; its card schema does not map to the fixed 379-question bank.

## Develop and verify

Node.js 20+ is sufficient. No package dependencies are required.

```sh
npm run dev
npm run check
npm run build
```

`npm run dev` serves the app at `http://127.0.0.1:4173/flashcardsquestionsandanswer/`.
`npm run build` writes the production-ready static site to `dist/`.
`scripts/validate-data.mjs` checks IDs, sections, choices, correct indices, images, and orphan assets.
`scripts/verify-pdf.py` optionally checks all 379 question markers and answer keys against the final PDF using `pypdf`.

## Furigana

`questions.json` remains the canonical, unchanged question data. `furigana.json`
stores readings keyed by exact source strings; the renderer validates each base
string before adding `<ruby><rt>` markup. This also covers UI text and metadata.
The image JPEGs remain unchanged. `image-furigana.json` places readings over
previously unannotated kanji in five images; images that already contain
furigana are displayed as they are.

`npm run check` verifies the question text and furigana coverage. The optional
`scripts/generate-furigana.py` regenerates the map and an audit report from the
canonical data. It requires `fugashi`, `unidic-lite`, `sudachipy`,
`sudachidict_core`, and `pykakasi` locally. Review the audit and readings
manually before replacing the checked-in map. These packages are not needed
to run the app.

## GitHub Pages

The repository root is directly deployable as the `main` branch's `/(root)` Pages source. Keep `index.html`, `sw.js`, `questions.json`, and `assets/` together. Alternatively publish the entire `dist/` directory using GitHub Actions. The manifest, service worker scope, scripts, and images all use relative URLs, so they resolve under `/flashcardsquestionsandanswer/`.

The existing `.github/workflows/quality.yml` runs checks on pushes and pull requests. GitHub Pages should be configured in **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root)** if branch deployment is used.

## Data provenance

The `questions.json` data was generated from the structured source used to produce the attached final PDF, then checked against that PDF's 379 master question markers and complete answer key. The referenced illustrations came from the same source figures used in the PDF. The original PDF is not required at runtime.
