# 109-abcmemory-no-track-player

**Master step:** 2.30
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Ensure abcmemory (skills/rules) forbids `react-native-track-player` and points at
  `podverse-media-engine`.

## Reconciliation (2026-07-22)

Already present in:

- `.cursor/skills/mobile-playback/SKILL.md`
- `.cursor/rules/mobile-carplay-android-auto.mdc`
- `.cursor/rules/mobile-react-native.mdc` / `apps/mobile/AGENTS.md`
- Module README + GO-NO-GO

Mentions of `track-player` are **prohibition / historical** only. Not a dependency.

## Acceptance criteria

- Skills/rules say use `podverse-media-engine` — **met**
- `apps/mobile/package.json` has no `react-native-track-player` — **met**

## Verification

```bash
! rg -q 'react-native-track-player' apps/mobile/package.json
rg -n 'podverse-media-engine|Do not use `react-native-track-player`' .cursor/skills/mobile-playback/SKILL.md
```
