# 157-macos-runner-ios

**Master step:** 4.8
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Document / configure `runs-on: macos-*` where iOS simulator E2E or local Xcode steps run.
- EAS cloud builds may not need macOS runners for compile — still need macOS for Maestro iOS in 5.9.

## Acceptance criteria

- Workflows that need Xcode/simulators use macos runners
- Documented in runbook

## Verification

```bash
rg -n 'macos-' .github/workflows/mobile-*.yml
```
