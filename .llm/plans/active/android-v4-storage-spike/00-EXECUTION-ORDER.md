# Android v4 storage spike — execution order

One prompt at a time. They share the emulator, `apps/mobile/app.config.ts`, and `FINDINGS.md`.

| Phase | Prompt | Depends on |
| ----- | ------ | ---------- |
| 1 | [01-v4-android-baseline.md](01-v4-android-baseline.md) | Sample rehearsal is not running |
| 2 | [02-v5-inplace-read.md](02-v5-inplace-read.md) | Phase 1 left v4 installed with the four keys |

Prompt 02 is the last prompt. It reverts the private package id, removes the temporary reader,
writes the rest of `FINDINGS.md`, and moves this directory to
`.llm/plans/completed/android-v4-storage-spike/`.

## Rules for every prompt

- Do not commit. Do not push. Do not edit `../podverse-rn`, doc 08, doc 16, or doc 17.
- Do not start `v4RunFullRehearsal`. If that process is already running, stop this turn.
- Counts and lengths only in `FINDINGS.md` and in the chat reply. No feed titles, no addresses,
  no database URL, no account id.
- Do not uninstall `com.podverse`.
- Do not run unit tests, lint, Maestro, or Playwright. This set does not change product
  behavior once prompt 02 has reverted.

## Verification

There is no product test command. After prompt 02 the operator reads `FINDINGS.md` in the
completed set. A pass is both keys present, each longer than an empty array, v5 character
lengths equal to the v4 lengths, field counts matching the fixture, outlines 2, skipped 0, and
`apps/mobile/app.config.ts` restored to `com.podverse.app.next`.
