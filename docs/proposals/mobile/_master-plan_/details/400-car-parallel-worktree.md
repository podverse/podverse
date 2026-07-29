# 400-car-parallel-worktree

**Master step:** 12.21
**Model (author + implement):** Auto
**Status:** done

## Scope

Operator/agent guidance for running Track 12 car native work (CarPlay Swift, Android Auto Kotlin,
and the `podverse-media-engine` module) in a **sibling git worktree** so it proceeds in parallel with
RN UI tracks without colliding on `ios/` / `android/` prebuild output.

This is a concise operator guide; the authoritative worktree workflow lives in the skills — do not
re-derive them here.

### Authoritative worktree workflow (link, don't duplicate)

- **git-worktree-sibling** (`.cursor/skills/git-worktree-sibling/SKILL.md`) — create/name worktrees
  as `podverse_<branch_slug>` siblings under `repos/pv/`; primary checkout stays on `develop`; run
  `make local_env_worktree_setup` + `npm install` in each new worktree.
- **mobile-worktree-scope** (`.cursor/skills/mobile-worktree-scope/SKILL.md`) — which mobile Tracks
  are safe to parallelize (PG groups) and native-vs-RN isolation. PG-8 (Track 12) is safe to
  parallelize with Tracks 13/14/15.

### Car-specific notes

- **Where car code lives:** `apps/mobile/ios/`, `apps/mobile/android/`, and
  `apps/mobile/modules/podverse-media-engine/` (the CarPlay/Android Auto native cache readers and
  bridge).
- **`ios/` and `android/` are gitignored prebuild output.** Each worktree regenerates them with
  `npm run mobile:prebuild` (from `apps/mobile`, via the repo Nix wrapper). **Never** commit them or
  hand-edit Xcode/Gradle for durable changes — durable native config goes through **config plugins /
  `app.config.ts`** only, so every worktree reproduces the same native project.
- **One device per worktree.** Run a single simulator/emulator per worktree to avoid device-state
  collisions; use the named E2E vs manual devices from the **mobile-ios-simulator** rule
  (`"iPhone 17 Pro"` / `Pixel_6_Pro_API_33` manual; `… E2E` / `…_e2e` for automated). A car session
  scopes to `apps/mobile/modules/`, `ios/`, `android/`; RN UI can proceed in another worktree as long
  as the JS↔native cache contract (12.1 / `380`) stays stable.
- **Keep native-cache invariants unchanged across worktrees:** the App Group identifier
  `group.com.podverse.app.next` and the versioned native-cache schema (`NATIVE_CACHE_SCHEMA_VERSION`)
  must not diverge between parallel checkouts, or a car reader built in one worktree won't match a
  writer from another.

### Proof gates (operator, manual)

Car flows are not fully automatable; prove them manually per the checklists in
`apps/mobile/modules/podverse-media-engine/`:

- Android Auto: [ANDROID-AUTO-DHU-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md)
  (browse + play with the phone app force-stopped).
- CarPlay: [CARPLAY-SIMULATOR-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md)
  (launch from background / app closed).

## Acceptance criteria

- This doc exists with header `**Status:** done` and is linked from master-plan step 12.21 (the link
  already points to this slug).
- Content is a concise operator guide (links + car-specific notes), not a re-derivation of the
  worktree skills.
- No code, script, or `ios/` / `android/` changes accompany it.

## Verification

```bash
# Confirm the detail doc exists and is marked done
test -f docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md
grep -n 'Status:.*done' docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md
```
