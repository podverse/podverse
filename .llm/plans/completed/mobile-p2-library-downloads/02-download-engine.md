# 02 — Download engine

**Cursor model:** Opus 5
**Reasoning:** high

## Scope

Detail: [734](/docs/proposals/mobile/_master-plan_/phase-2/details/734-download-pause-resume-concurrency.md)
(+ schema pieces from 732/733).

1. Migration v13: `channel_id_text`, `channel_title`, `dismissed_from_list` on `download`.
2. Extend `DownloadRecord` / status with `paused`; `dismissedFromList`; channel fields.
3. `downloadManager`: concurrency 5; `pause` / `resume` / `pauseAll` / `resumeAll`;
   `dismissAllFinished`; enqueue writes channel fields from `DTOItem`.
4. Prefs: quota bytes (default 10 GiB / Unlimited), auto-delete-on-limit, auto-delete-on-device-low.
5. Quota helpers: device-low eviction; read user cap; keep oldest-first victims.
6. Update unit tests for quota / in-progress counts (paused counts as in-progress for badges).

## Files

- `apps/mobile/src/data/db/migrations.ts`, `schema.ts`
- `apps/mobile/src/downloads/*`
- `apps/mobile/src/prefs/downloadPrefs.ts`, `prefsStore.ts`
- `apps/mobile/src/data/repositories/downloadsRepository.ts`

## Do not

- Do not run tests during agent work.
- Do not put downloads into the serial sync queue.

## Verification (operator)

```bash
# Mobile
npm --prefix apps/mobile run test -- src/downloads
```
