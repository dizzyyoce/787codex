# 787prada Codex

A community reference compiled from 787prada's PoE2 build guides, mechanics breakdowns and strategy videos.
Live at https://dizzyyoce.github.io/787codex/

## Updating the site

Upload a new `compendium.xlsx` to this repo, replacing the old one. That's it: the GitHub Action
turns the workbook into the website and publishes it within a couple of minutes.

The run's summary page (Actions tab) lists any workbook warnings, such as a video ID that isn't
on the Videos tab or a Key Tech cell longer than three sentences. Warnings never block publishing.

### Workbook rules the site relies on

- **Keep tab names and column headings as they are.** The site reads them by name.
- **Patch Changes → "Affected build(s)":** write build names as they appear on the Builds tab.
  When a build has several versions, name the version ("Original Scattering Calamity Titan");
  otherwise the current version is used. Nicknames are fine alongside the real name,
  e.g. "Frog Build (Poisonburst Oracle)". Text that says a change is "not tied to a specific build"
  links to none.
- **Optional "Build IDs" column on Patch Changes** (e.g. `B03, B20`): if present, it overrides the
  name matching for that row.
- **Builds → "Mechanics used":** entries separated by " · " link to a mechanic when their words
  match the start of the mechanic's name ("Culling Strike", "Lightning Warp").
- Mechanic names mentioned in Key Tech, mechanic descriptions and patch changes are linked
  automatically using the start of each mechanic's name.

## Making changes to the site itself

Changes go through a pull request. The **Check the site builds** action builds the site on every
pull request, so a change that would break it shows a red cross before it's merged. Merging into
`main` publishes.

## Settings

- `site/src/lib/config.js`: `GOATCOUNTER` is the visitor-stats code
  (https://dizzyy.goatcounter.com). Set it to `""` to switch stats off.
- `site/astro.config.mjs`: the site's address and base path (`/787codex/`).

## How it's built

- `scripts/export.py` reads the workbook and writes `site/src/data/codex.json`: builds, mechanics,
  patch changes, videos, the build ↔ mechanic links and the build ↔ patch-change matches.
- `site/` is an [Astro](https://astro.build) project. It builds:
  - one page per build and mechanic, plus the section pages
  - `search.json`, used by the search box and the hover cards
  - link-preview images for Discord and Reddit (`og/…png`)
  - `sitemap.xml` for search engines, and a "page not found" page with suggestions
  - the app manifest and service worker (installable, works offline)
- Things remembered per reader (favourites, "new since your last visit") stay in their own browser.
- `.github/workflows/deploy.yml` builds and publishes on every push to `main`;
  `.github/workflows/check.yml` builds on every pull request.

To preview locally: `python scripts/export.py compendium.xlsx site/src/data/codex.json`,
then `cd site && npm install && npm run dev`.
