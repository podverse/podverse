# 437-auto-delete-policy

**Master step:** 13.8
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Optional auto-delete when quota exceeded: **oldest completed downloads first** (by
  `updated_at` / completed time).
- Toggle or always-on sketch — prefer a settings/downloads toggle default **off** so users are
  not surprised.
- Integrate with download complete path: if over quota after success, run cleanup until under cap.

## Acceptance criteria

- Policy implemented and documented
- Auto-delete removes SQLite row + file; projects native cache (13.9)
- User-visible note when items were auto-removed (toast/banner sketch OK)
- Does not delete in-progress jobs

## Web parity references

- Mobile-only

## Verification

```bash
npm --prefix apps/mobile run test
```
