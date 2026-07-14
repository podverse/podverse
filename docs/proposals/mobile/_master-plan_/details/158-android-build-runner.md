# 158-android-build-runner

**Master step:** 4.9
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Document Android build path: prefer EAS Android build (Linux OK in cloud); local/CI emulator
  jobs may use macOS or Linux with Android SDK.
- Align with Maestro Android AVD `Pixel_6_Pro_API_33`.

## Acceptance criteria

- Runner choice documented per job type (EAS vs emulator E2E)
- No tablet AVD as default

## Verification

```bash
rg -n 'android|ubuntu|macos|Pixel_6' .github/workflows/mobile-*.yml docs/operations/mobile/ 2>/dev/null | head
```
