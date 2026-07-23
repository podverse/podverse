# 331-native-cache-queue-write

**Master step:** 10.22
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Write native cache snapshot on queue/auto-queue changes (feeds Track 12).
- Use projection hooks from 9b (`projectQueueSnapshotToNativeCache`); implement real write if
  bridge stubs exist, else keep stub but ensure all mutation paths call it.

## Architecture notes

Dual-store §7.1: SQLite for phone UI; native cache for car/watch. PG-7a completes call-site
coverage; storage backend may remain stub until Track 12.

## Edge cases / cross-track deps

- High-frequency updates: debounce only if web/car docs allow — default sync write
- Cross-track: 2.35 cache-hook contract

## Acceptance criteria

- Every queue/auto-queue mutation path invokes projection exactly once per successful commit
- Schema/doc points to Track 12 cache schema (12.1)
- No SQLite handles passed to car layer

## Web parity references

- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- Detail 114 / 2.35 engine cache hooks
- Detail 493 queue repo projection

## Verification

```bash
# confirm call sites with rg
rg projectQueueSnapshotToNativeCache apps/mobile/src
```

## Depends on

- 10.1, 10.8, 9b.4, 2.35
