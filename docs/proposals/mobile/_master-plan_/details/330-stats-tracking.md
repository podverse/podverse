# 330-stats-tracking

**Master step:** 10.21
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Wire `reqStats*` on play/page events from the mobile client (web parity intents).

## File paths

- Keep stats inside orchestrator/hook layer, not screens.

## Acceptance criteria

- Play events fire for explicit_play / fresh_transition per music/podcast rules
- Failures are non-blocking for playback
- No PII beyond what web sends

## Web parity references

- Web stats request wrappers used by MediaPlayer / list rows
- Mobile API client auth headers

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
```

## Depends on

- 10.16
