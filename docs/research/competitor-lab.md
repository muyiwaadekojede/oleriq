# Competitor Lab

## Purpose

- [Verified] This document defines the tracked operating contract for the competitor lab used by the npm commands `research:lab:init`, `research:lab:sync:*`, `research:lab:status`, and `research:lab:audit`.
- [Verified] The lab is for competitor repo discovery, sync, audit, and repeated investigation.
- [Verified] The lab is not part of the tracked Oleriq application source tree.

## Path Contract

- [Verified] The external source-of-truth path is `C:\Users\Godsgrace\Desktop\codez\Oleriq-competitor-lab`.
- [Verified] The repo-facing mount path is `C:\Users\Godsgrace\Desktop\codez\Oleriq\competitor-lab`.
- [Verified] The repo-facing path must be a Windows junction (a Windows directory pointer that exposes another folder tree without copying it) targeting the external path.
- [Verified] The external path is the canonical lab state. The in-repo junction is a discoverability mount only.

## Expected Lab Layout

```text
C:\Users\Godsgrace\Desktop\codez\Oleriq-competitor-lab\
  repos\
    direct-products\
      <slug>\
    adjacent-tools\
      <slug>\
  manifests\
    repositories.csv
  notes\
    <slug>\
  evidence\
    <slug>\
  reports\
    current-lab-status.md
    current-lab-status.json
    repo-metadata.csv
    repo-metadata.json
```

- [Verified] `repos\direct-products\` stores the first sync cohort.
- [Verified] `repos\adjacent-tools\` stores the second sync cohort.
- [Verified] `manifests\repositories.csv` is the main inventory used by sync, status, and audit.
- [Verified] `notes\<slug>\` stores per-repo working notes and deeper analysis artifacts.
- [Verified] `evidence\<slug>\` stores raw downloaded evidence, command output, screenshots, or other saved proof.
- [Verified] `reports\` stores generated cross-repo outputs.

## Commands

```powershell
npm run research:lab:init
npm run research:lab:sync:direct
npm run research:lab:sync:adjacent
npm run research:lab:sync:all
npm run research:lab:status
npm run research:lab:audit
```

- [Verified] `research:lab:init` creates the external folder tree, creates or repairs the root junction, and seeds `manifests\repositories.csv`.
- [Verified] `research:lab:sync:direct` clones or updates the direct cohort only.
- [Verified] `research:lab:sync:adjacent` clones or updates the adjacent cohort only.
- [Verified] `research:lab:sync:all` clones or updates the full manifest.
- [Verified] `research:lab:status` is the first command every future agent should run before using the lab.
- [Verified] `research:lab:audit` inspects cloned repos and refreshes normalized metadata plus the human-readable lab summary.

## Manifest Contract

- [Verified] The manifest file is `competitor-lab\manifests\repositories.csv`.
- [Verified] The required columns are:

```text
slug
display_name
category
remote_url
official_site
official_docs
license
license_class
local_path
clone_status
last_fetched_at
analysis_status
reuse_gate
notes_path
```

- [Verified] `category` must be one of `direct_product`, `hybrid_or_adjacent_commercial`, or `enabling_tool`.
- [Verified] `license_class` must be one of `permissive`, `weak_copyleft`, `strong_copyleft`, or `unknown`.
- [Verified] `reuse_gate` must be one of `reference_only`, `legal_review_required`, or `approved_for_limited_adoption`.
- [Verified] `clone_status` tracks whether the repo is not cloned yet, cloned or synced, or treated as hosted-only when no clone target exists.
- [Verified] `analysis_status` tracks local investigation progress. This repo currently uses `missing` as the default seed state.
- [Verified] The current sync cohorts are fixed by script logic:
  - [Verified] `direct`: `firecrawl`, `jina-reader`, `apify-crawlee`, `browser-use`, `scrapegraphai`, `webclaw`, `webpeel`, `crw`, `crawl4ai`
  - [Verified] `adjacent`: `browserpilot`, `teracrawl`, `playwright-mcp`, `trafilatura`, `mozilla-readability`, `webustler`, `crawl4ai-mcp-server`

## Recovery Steps

### Missing External Root

```powershell
npm run research:lab:init
```

### Missing or Broken Junction

```powershell
if (Test-Path 'C:\Users\Godsgrace\Desktop\codez\Oleriq\competitor-lab') {
  $junction = Get-Item 'C:\Users\Godsgrace\Desktop\codez\Oleriq\competitor-lab' -Force
  $junction.Delete()
}
New-Item -ItemType Junction `
  -Path 'C:\Users\Godsgrace\Desktop\codez\Oleriq\competitor-lab' `
  -Target 'C:\Users\Godsgrace\Desktop\codez\Oleriq-competitor-lab'
```

### Missing or Unreadable Manifest

```powershell
npm run research:lab:init
```

### Remote Mismatch

- [Verified] Do not reclone over the existing repo blindly.
- [Verified] Compare the manifest remote with the repo `origin` and decide whether the repo folder was pointed to the wrong upstream or the manifest entry is wrong.
- [Verified] Run `npm run research:lab:status` again after the correction.

## Future Agent Workflow

1. [Verified] Run `npm run research:lab:status`.
2. [Verified] If root, junction, or manifest health is broken, repair it first with `npm run research:lab:init`.
3. [Verified] Read `competitor-lab\manifests\repositories.csv`.
4. [Verified] Inspect the needed repo folder under `competitor-lab\repos\...`.
5. [Verified] Use `docs/research/templates/competitor-repo-analysis.md` for deeper repo analysis.
6. [Verified] Apply `docs/research/competitor-reuse-policy.md` before making any reuse recommendation.
7. [Verified] Record final reuse posture under `docs/research/reuse-decisions\`.
8. [Verified] Run `npm run research:lab:audit` after meaningful lab changes so the next agent inherits a current summary.
