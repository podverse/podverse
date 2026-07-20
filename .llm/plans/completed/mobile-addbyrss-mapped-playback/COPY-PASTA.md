# COPY-PASTA — mobile-addbyrss-mapped-playback

Run prompts in order (1 → 2). Each prompt: read its plan file + listed docs, implement, check the
box here. **Do not run tests during agent work** — operator verifies at the end (and on the final
step: cumulative commands + archive).

Prerequisite: Track 9b completed
(`.llm/plans/completed/mobile-pg6.5-data-layer/`).

## Step 1 — Mapped playback

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-addbyrss-mapped-playback/01-mapped-playback.md
Also read detail 494. Wire getMappedFeedByUrl + parser-mapping buildAddByRSSResourceData into
useAddByRssPlayback (slim fallback). Mark done when finished.
Do not run tests during agent work.
```

## Step 2 — Radii + shim docs (final)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-addbyrss-mapped-playback/02-radii-and-shim-docs.md
Replace tokens.radii.full with radii.round; document Metro crypto shim in APPS-MOBILE.md.
On this final step, archive this plan set to
.llm/plans/completed/mobile-addbyrss-mapped-playback/ and end with the cumulative operator
verification commands for the whole set.
Do not run tests during agent work.
```
