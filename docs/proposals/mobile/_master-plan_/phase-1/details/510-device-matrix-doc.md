# 510-device-matrix-doc

**Master step:** 18.1
**Model (author + implement):** Auto
**Status:** done

## Scope

Document the mobile device matrix so later Track 18 steps (tablet, watch, TV) share one
authoritative reference. Add a new section to
[APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md) (or a linked
`docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md`) that lists each target,
its v1 status, primary input model, and which app process it runs in.

Matrix rows (at minimum):

| Device      | v1 status                | Input        | Process / data source                   |
| ----------- | ------------------------ | ------------ | --------------------------------------- |
| Phone       | Primary                  | Touch        | RN app + SQLite repositories            |
| Tablet      | Supported (responsive)   | Touch        | Same RN app process + SQLite (shared)   |
| Wear OS     | Remote/complication only | Touch/rotary | MediaSession / native cache (no SQLite) |
| Apple Watch | Deferred (post-v1)       | Touch/crown  | MediaSession bridge (if adopted)        |
| Android TV  | Supported (leanback)     | D-pad        | RN app process, D-pad focus nav         |
| tvOS        | Deferred (post-v1)       | Remote       | —                                       |

## Acceptance criteria

- One committed doc row-per-device with v1 status, input, and data-source column.
- Explicitly states tablets share phone SQLite repositories; watches do **not** read SQLite
  (MediaSession / native cache only), matching
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).
- Linked from Track 18 in the master plan and from 535 (track scope matrix).
- Records the tablet breakpoint decision (Decision A) and the rendered-coverage note:
  600–899dp remains a logic-level-tested mid-band by default, with any rendered proof scoped as an
  optional nightly follow-up under **18.16** (not a PR gate).

## Verification

```bash
test -f docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md || grep -q "Device matrix" apps/mobile/APPS-MOBILE.md
```
