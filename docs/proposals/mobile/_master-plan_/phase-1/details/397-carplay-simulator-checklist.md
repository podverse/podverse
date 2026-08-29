# 397-carplay-simulator-checklist

**Master step:** 12.18
**Model (author + implement):** Auto
**Status:** done

## Scope

- Operator manual checklist proving CarPlay browse+play with the phone app force-quit — **Android
  Auto parity** (Library + Downloads), not full UX-parity IA.
- Durable doc lives at:
  [CARPLAY-SIMULATOR-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md)
  (already stubbed; refresh when scene lands so steps match the implemented templates).

## Acceptance criteria

- Checklist covers: seed cache → force-quit → open CarPlay Simulator → browse Library/Downloads →
  play offline → shared engine / now-playing.
- Cross-links entitlement runbook + iOS cache spike.
- Linked from release runbook / GO-NO-GO as appropriate (with 12.19 iOS).

## Verification

```bash
test -f apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md
rg -n 'Library|Downloads|force' apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md
```

## Depends on

- 12.7–12.10 implementation
- 12.16 iOS entitlement doc
