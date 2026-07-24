# 03 — Stack header back + Maestro smoke (9d.5)

**Cursor model:** Auto (back audit) / Codex 5.3 if adding Maestro YAML  
**Detail:** 594  
**Ship bar:** Usable back navigation sketch — not icon polish.

## Goal

Ensure Library (and other nested stacks touched by 9d) can always go back from push screens; add a
light Maestro smoke for create → detail if practical.

## Context

- Detail 594
- `apps/mobile/src/navigation/index.tsx` — stack `options` / `headerBack*` / `headerLeft`
- Track 7.10 Android hardware back already done — do not break full-player back order
- **mobile-e2e-screenshots**, HOW-TO-RUN

## Tasks

1. Audit Home / Library / Search nested stacks: every push screen has header back **or** documented
   exception (tab roots). Fix dead-ends introduced by create/edit routes.
2. Prefer React Navigation defaults + existing `ScreenHeader` patterns; no custom iconography pass.
3. **Optional but preferred:** add `apps/mobile/e2e/library-playlists.yaml` (or extend an existing
   library flow) that: login → Library playlists → create (or open existing) → assert detail /
   back. Keep it smoke-level; skip if create requires too much fixture setup — then document
   manual verify only.
4. Mark **9d.5** `done`; if last prompt in set, archive
   `.llm/plans/active/mobile-track9d-playlist-authoring/` → `completed/` per **plan-completion**;
   update master plan Current status + `LLM-PLANS-ACTIVE.md`.

## Acceptance

- From PlaylistCreate / PlaylistEdit / PlaylistDetail, user can return to list without killing app
- No regression to Android full-player back behavior (7.10)

## Cumulative operator verify (whole 9d set)

Leave-running per HOW-TO-RUN (**Mobile Metro** `mobile:dev:e2e`, **Mobile E2E API**, devices). Then:

```bash
# Mobile Maestro — use library-playlists if added; else video-transition still OK from prior phase
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm --prefix apps/mobile run test
```
