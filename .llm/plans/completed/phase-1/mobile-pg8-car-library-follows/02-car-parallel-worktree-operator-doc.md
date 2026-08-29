# 02 — Car parallel-worktree operator doc (12.21)

**Master step:** 12.21
**Detail doc:** `400-car-parallel-worktree` (does **not** exist yet — create it)
**Model:** Auto (docs only)

## Goal

Document how an operator/agent runs Track 12 car native work (CarPlay Swift, Android Auto Kotlin)
in a **sibling git worktree** so it can proceed in parallel with other mobile tracks without
colliding on `ios/` / `android/` prebuild output. This is the final Track 12 step; completing it
flips the track to `(DONE)`.

## Deliverable

Create `docs/proposals/mobile/_master-plan_/phase-1/details/400-car-parallel-worktree.md` using the
Appendix D template:

```markdown
# 400-car-parallel-worktree

**Master step:** 12.21
**Model (author + implement):** Auto
**Status:** done

## Scope

...operator guidance (below)...

## Acceptance criteria

...

## Verification

...
```

## Content to capture

- Point to the **mobile-worktree-scope** skill
  (`.cursor/skills/mobile-worktree-scope/SKILL.md`) and **git-worktree-sibling** skill as the
  authoritative worktree workflow; do not duplicate their full contents — summarize and link.
- Car-specific notes:
  - Native car code lives in `apps/mobile/ios/`, `apps/mobile/android/`, and
    `apps/mobile/modules/podverse-media-engine/`. `ios/` and `android/` are **gitignored
    prebuild output** — each worktree regenerates them via `npm run mobile:prebuild`; never commit
    them or hand-edit Xcode/Gradle for durable changes (config plugins / `app.config.ts` only).
  - Run one simulator/emulator per worktree to avoid device-state collisions; use the named E2E
    vs manual devices from the **mobile-ios-simulator** rule.
  - Keep the App Group identifier and native-cache contract unchanged across worktrees
    (`group.com.podverse.app.next`).
- Reference the operator proof gates: `ANDROID-AUTO-DHU-CHECKLIST.md` and
  `CARPLAY-SIMULATOR-CHECKLIST.md` in `apps/mobile/modules/podverse-media-engine/`.

## Acceptance criteria

- `details/400-car-parallel-worktree.md` exists, header `**Status:** done`, and is linked from
  master-plan step 12.21 (the link already points to this slug).
- Content is a concise operator guide (links + car-specific notes), not a re-derivation of the
  worktree skills.

## Non-goals

- No code changes. No new scripts. No changes to `ios/` / `android/`.

## Operator verification (end of step)

```bash
# Confirm the detail doc exists and is marked done
test -f docs/proposals/mobile/_master-plan_/phase-1/details/400-car-parallel-worktree.md
grep -n 'Status:.*done' docs/proposals/mobile/_master-plan_/phase-1/details/400-car-parallel-worktree.md
```
