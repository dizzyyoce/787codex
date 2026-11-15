# 787prada Codex

A community reference compiled from 787prada's PoE2 build guides, mechanics breakdowns and strategy videos.
Live at https://dizzyyoce.github.io/787codex/

## Updating the site

Upload a new `compendium.xlsx` to this repo (replacing the old one). That's it: the GitHub Action
turns the workbook into the website and publishes it within a couple of minutes.

The run's summary page (Actions tab) lists any workbook warnings, such as a video ID that isn't
on the Videos tab or a Key Tech cell longer than three sentences. Warnings never block publishing.

Keep tab names and column headings as they are; the site reads them by name.

## How it's built

- `scripts/export.py` reads the workbook and writes `site/src/data/codex.json`.
- `site/` is an [Astro](https://astro.build) project that builds one page per build and mechanic,
  plus the section pages, a search index (`search.json`) and the hover previews.
- `.github/workflows/deploy.yml` runs both and publishes `site/dist` to GitHub Pages.

To preview locally: `python scripts/export.py compendium.xlsx site/src/data/codex.json`,
then `cd site && npm install && npm run dev`.
