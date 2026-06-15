# Embed list types and fixes — COPY-PASTA prompts

Sequential phases. Run one prompt, wait for completion, then the next. Do not run tests during implementation; the operator verifies at the end.

Progress:

- [x] 01 progress bar fix
- [x] 02 single demo order
- [x] 03 episode-chapters runtime
- [x] 04 demo showcase slots
- [x] 05 builder content + sort
- [x] 06 tests + docs

---

## Phase 1

```
Read and execute .llm/plans/active/embed-list-types-and-fixes/01-progress-bar-fix.md
Restore the video embed progress bar by making .controlsRow full-width and giving .progressRow a min-width floor.
```

## Phase 2

```
Read and execute .llm/plans/active/embed-list-types-and-fixes/02-single-demo-order.md
Reorder single demo sections to episode/track/chapter/clip (audio then video) via catalog order; hide official-clip + playlist from the demo page (keep routes).
```

## Phase 3

```
Read and execute .llm/plans/active/embed-list-types-and-fixes/03-episode-chapters-runtime.md
Add the episode-chapters list route kind, route, fetch branch via reqItemParseAndGetChapters, and a mapper with seek-within-episode playback + client-side asc/desc.
```

## Phase 4

```
Read and execute .llm/plans/active/embed-list-types-and-fixes/04-demo-showcase-slots.md
Add the 4 new list demo slots and seed REAL content: parse chapters for the chapters-list episode and create multiple public demo-account clips for the clips-list channel.
```

## Phase 5

```
Read and execute .llm/plans/active/embed-list-types-and-fixes/05-builder-content-and-sort.md
Extend the builder with list content types (episodes/clips/tracks/chapters) resolved by source resource, plus per-content-type sort UI.
```

## Phase 6

```
Read and execute .llm/plans/active/embed-list-types-and-fixes/06-tests-and-docs.md
Add unit + E2E coverage and update docs/features/EMBED-PLAYER.md.
```
