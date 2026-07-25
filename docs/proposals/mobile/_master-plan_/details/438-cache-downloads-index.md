# 438-cache-downloads-index

**Master step:** 13.9
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- On every successful download complete / delete / auto-delete, rebuild and write the
  **downloads index** projection via `projectDownloadsIndexToNativeCache` (and engine
  `writeDownloadsIndex` when the bridge is available).
- Keep call sites in the **repository / download manager** — not React screens.
- Track 12 will replace stub storage; this step must not invent a throwaway schema that
  fights 12.1 — use existing `NativeCacheDownloadEntry` / `DownloadsIndexProjection` shapes
  and extend fields only if needed for car offline browse (12.14).

## Architecture notes

- Dual-store: SQLite for phone UI; native cache for car when JS is dead
  ([DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md) §7.1)
- Payload: `idText`, `title`, `filePath` (+ media URL if required by engine contract 114)
- Idempotent: projecting full index after each mutation is fine for sketch scale

## Edge cases

- Projection failure must not roll back a successful file download (log + soft fail)
- Empty index write on delete-all
- Paths must be readable by native car layer later (absolute sandbox paths)

## Acceptance criteria

- Every downloads repository mutation that changes complete files calls projection once
- `__DEV__` stub logs visible until Track 12 storage lands
- Documented cross-ref to Track 12.1 / 12.4 / 12.14

## Web parity references

- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/details/114-engine-native-cache-hooks.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc) rule

## Verification

```bash
# Grep call sites after implement
rg projectDownloadsIndexToNativeCache apps/mobile/src
```

## Depends on

- 2.35 / 114 contract stubs — done
- 13.3 repository — this phase
- Track 12 durable storage — later (stubs OK now)
