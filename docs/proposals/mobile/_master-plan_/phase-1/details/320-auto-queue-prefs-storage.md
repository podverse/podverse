# 320-auto-queue-prefs-storage

**Master step:** 10.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Persist auto-queue shuffle/repeat prefs in device storage (web cookie keys `aqc.rd` / `aqc.rp`).
- Use AsyncStorage/MMKV prefs pattern already used for theme (`uit`), not SQLite.

## File paths

- Store under existing mobile prefs module if present; else create thin prefs helper.

## Acceptance criteria

- Prefs survive app restart
- Key names documented with web cookie parity
- Defaults match web when unset

## Web parity references

- Web cookies `aqc.rd` / `aqc.rp` via local settings
- Mobile prefs: theme/media-type AsyncStorage patterns (Track 7 / 16)

## Verification

```bash
npm run mobile:e2e:test -- hello-world
```

## Depends on

- 10.8
