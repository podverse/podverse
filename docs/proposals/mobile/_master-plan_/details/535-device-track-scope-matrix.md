# 535-device-track-scope-matrix

**Master step:** 18.15
**Model (author + implement):** Auto
**Status:** done

## Scope

Document which existing tracks are **phone-only** vs **shared native modules** per device, so watch
(18.6–18.9) and TV (18.10–18.14) work knows what it inherits vs must build. Extends the device
matrix doc (510) with a per-track column.

Produce a table mapping tracks/subsystems to each device target:

| Subsystem                        | Phone | Tablet           | Wear/Watch          | TV (Android TV)      |
| -------------------------------- | ----- | ---------------- | ------------------- | -------------------- |
| RN screens / navigation          | Yes   | Yes (responsive) | No (remote only)    | Yes (D-pad focus)    |
| SQLite repositories (Track 9b)   | Yes   | Yes (shared)     | No (native cache)   | Yes                  |
| Media engine (Track 2)           | Yes   | Yes              | Remote commands     | Yes                  |
| Native cache / MediaSession (12) | Yes   | Yes              | **Source of truth** | Yes                  |
| Downloads (Track 13)             | Yes   | Yes              | No                  | Optional             |
| Mini/full player (Track 11)      | Yes   | Yes (two-col)    | Complication only   | Full-screen, no mini |

## Acceptance criteria

- One committed table, one row per major subsystem/track, one column per device target.
- Marks watch as MediaSession/native-cache consumer (no SQLite), consistent with 510 and
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).
- Linked from Track 18 and referenced by the watch/TV detail docs when they are authored.

## Verification

```bash
grep -q "phone-only" docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md || true
```
