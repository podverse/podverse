# 327-anonymous-playback-snapshot

**Master step:** 10.18
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Persist anonymous playback snapshot (mirror web `anonymousPlaybackStorage`).
- Device storage; not SQLite queue tables for auth tokens (none), but snapshot of now-playing.

## Architecture notes

Port `apps/web/src/utils/anonymousPlaybackStorage.ts` semantics to RN AsyncStorage/MMKV.

## Edge cases / cross-track deps

- Corrupt snapshot → ignore + clear
- Size limits

## Acceptance criteria

- Anonymous play/queue survives restart
- Logged-in users do not write anonymous snapshot (or clear on login start)
- Parse/validate snapshot shape like web

## Web parity references

- Web: `apps/web/src/utils/anonymousPlaybackStorage.ts` (+ tests)

## Verification

```bash
npm run test -w apps/web
# add mobile unit tests for snapshot parse when implemented
```

## Depends on

- 10.1, 10.14
