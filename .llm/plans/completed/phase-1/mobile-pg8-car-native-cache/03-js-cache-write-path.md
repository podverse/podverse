# 03 — JS cache write path (12.4)

**Cursor model:** Opus 4.8  
**Details:**
[383-js-cache-write-path](/docs/proposals/mobile/_master-plan_/phase-1/details/383-js-cache-write-path.md)

## Goal

Wire all three projection helpers to the durable bridge writes with schema-versioned JSON, and
ensure library-browse projection has a repository call site.

## Do

1. Read detail 383 and current `projection.ts` + `queueRepository` / `downloadsRepository`.
2. Implement `writeQueueSnapshot` / `writeLibraryBrowseIndex` forwards (downloads already
   forwards `writeDownloadsIndex` — upgrade payload to schema from 12.1).
3. Soft-fail bridge errors; never roll back SQLite mutations.
4. Find or add library-browse projection call site(s) on subscribed podcasts / playlists index
   mutations (repository layer only).
5. Update comments in `projection.ts` (remove “storage not wired” as sole behavior).
6. Mark **12.4** + Appendix C **383** + detail header **done**.

## Do not

- Call bridge writes from React screens/providers.
- Persist auto-queue unless already in scope elsewhere.
- Run tests during agent work.

## Skills / rules

- **mobile-data-layer**, **mobile-carplay-android-auto**

## Operator verify

```bash
rg -n 'writeQueueSnapshot|writeLibraryBrowseIndex|writeDownloadsIndex' \
  apps/mobile/src/data/nativeCache
rg -n 'projectLibraryBrowseIndexToNativeCache' apps/mobile/src
```
