# 05 — E2E offline play (13.10)

**Cursor model:** Codex 5.3  
**Details:** 439  
**Ship bar:** Maestro smoke + screenshots — final prompt for this set.

## Goal

Add Maestro area proving download → offline (or local-file) play with step screenshots.

## Context (read first)

- Detail 439
- Skills: **mobile-e2e-screenshots**, **mobile-maestro-timeouts**
- `apps/mobile/e2e/HOW-TO-RUN.md`
- Existing library / playback flows for patterns
- Prefer E2E test-assets enclosure when available (`mobile:e2e:test-assets`)

## Tasks

1. Add `apps/mobile/e2e/library-downloads.yaml` (or equivalent area name).
2. Flow: open downloads / episode → download → wait complete → play → screenshot player.
   Fixture must be **progressive + non-live** (not livestream / m3u8).
3. Document airplane-mode limitation if Maestro cannot toggle network; assert local play via
   UI state / testID if needed.
4. Mark **13.10** `done`; archive `.llm/plans/active/mobile-track13-downloads/` → `completed/`
   per **plan-completion**; update `LLM-PLANS-ACTIVE.md`.
5. If Track 13 is fully `done`, leave track heading without requiring other PG-9 tracks.

## Out of scope

- Implementing Track 12 car QA

## Acceptance

- `npm run mobile:e2e:test -- library-downloads` is the operator verify command
- Cumulative verify listed in COPY-PASTA “After all complete”
