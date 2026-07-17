# 491-data-layer-repository-seam

**Master step:** 9b.2
**Model (author + implement):** Opus 4.8
**Status:** planned

## Scope

- Create `apps/mobile/src/data/repositories/` and `apps/mobile/src/data/sync/` with a documented
  seam: screens/hooks call repositories; repositories own DB + `ApiRequestService` usage.
- Define **native cache projection** helpers (or stubs wrapping engine 2.35 hooks) that repositories
  call after queue / downloads / library-index mutations. Schema details stay Track 12; call sites
  must exist in 9b so car/watch work does not rewrite repositories later.
- Add abcmemory pointer in `apps/mobile/AGENTS.md` (already noted) and enforce in
  **mobile-data-layer** skill.
- Provide a thin example repository (e.g. health/account stub) proving the pattern.

## Acceptance criteria

- No new product-data screen code calls `createMobileApiRequestService` directly
- Repository modules export typed domain methods returning helpers DTOs
- Sync helpers support read-through + write-behind hooks
- Projection helpers exist (`projectQueueSnapshotToNativeCache` etc., stubs OK) and are documented
  as required call sites for car/watch domains — see
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)

## Web parity references

- API wrappers remain `@podverse/helpers-requests` (same as web)
- Decision:
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)

## Verification

```bash
npm run mobile:e2e:test -- hello-world
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
