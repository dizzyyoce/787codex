# 787prada Codex

The website is built automatically from `compendium.xlsx` every time it changes.

## Updating the site after a new video

1. Update the workbook in Excel as usual (new Videos row, new Builds row, and so on).
2. Save a copy named exactly **compendium.xlsx**.
3. On this repository's page, click **Add file → Upload files**, drop in `compendium.xlsx`, and click **Commit changes**.
4. Wait about two minutes. The **Actions** tab shows a green tick when the site is live.

If the Actions tab shows a red cross, open it to see the error; the most common cause is a renamed column in the workbook.

## What's in here

- `compendium.xlsx`: the master data (the same workbook readers can download from the site).
- `scripts/site.py` and `scripts/site_template.html`: turn the workbook into the web page.
- `.github/workflows/deploy.yml`: the automatic build-and-publish step.
