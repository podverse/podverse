# 082-bridge-method-contract

**Master step:** 2.3
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Document each bridge method: `load`, `play`, `pause`, `seek`, `setRate`, `getPosition`,
  `getDuration`, `destroy` (args, return, errors, threading expectations).
- Place contract in module README or `apps/mobile/docs` section linked from APPS-MOBILE.
- Align event names with step 2.10 (`playbackState`, `progress`, `ended`, `error`, `stalled`).

## Architecture notes

- `load` prepares URL + initial seek; `play` starts; prefer a later `loadAndStart` (2.25) as convenience.
- Position/duration are seconds (number); match web bridge units.
- Document reserved cache-write methods from **114** in the same contract doc (even if no-op stubs).
- Note: seamless car browse/play is **Track 12**; this contract only reserves the write surface.

## Acceptance criteria

- Step 2.3 complete per master plan
- Written contract lists every playback method and event
- Cache-write methods listed with “schema owned by 12.1”
- No track-player terminology

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md §5](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [mobile-playback](/.cursor/skills/mobile-playback/SKILL.md)
- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/details/114-engine-native-cache-hooks.md)

## Verification

```bash
rg -n 'getPosition|setRate|destroy|writeQueueSnapshot' apps/mobile/modules/podverse-media-engine apps/mobile/APPS-MOBILE.md
```
