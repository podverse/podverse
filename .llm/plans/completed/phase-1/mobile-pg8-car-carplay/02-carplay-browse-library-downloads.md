# 02 — CarPlay browse Library + Downloads (12.8)

**Cursor model:** Opus 4.8
**Detail:**
[387-ios-carplay-browse-templates](/docs/proposals/mobile/_master-plan_/phase-1/details/387-ios-carplay-browse-templates.md)

## Goal

CarPlay shows the same v1 browse IA as Android Auto: **Library** + **Downloads** from
`PodverseNativeCache` JSON, with the phone app force-quit.

## Context

- Mirror Android `PodverseMediaLibraryService` / `PodverseNativeCacheModel` tree shape (details 391,
  393).
- Payload types: `apps/mobile/src/data/nativeCache/projection.ts`.
- Library today = add-by-RSS follows only; empty Library when only directory follows (12.22 later).

## Do

1. Read detail 387; implement Swift cache model parsers (tolerant `org.json`-equivalent).
2. Root templates: Library (browsable nodes) + Downloads (playable items). Omit empty sources.
3. Wire item-select hooks for Downloads toward play (step 3 can complete load).
4. On scene connect: `debugDump()` then build templates from cache.
5. Mark **12.8** + Appendix C **387** + detail header **done**; check COPY-PASTA box.

## Do not

- Do not read SQLite from the CarPlay scene.
- Do not fetch network to build the tree.
- Do not add Queue/History/Music/Podcasts tabs (UX-parity later).
- Do not run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-data-layer**

## Operator verify (after implement)

```bash
rg -n 'CPListTemplate|Library|Downloads|library-browse|downloads-index' apps/mobile/modules/podverse-media-engine/ios
```
