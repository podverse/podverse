# 719-sync-event-log

**Master step:** P2.4.10
**Model (author + implement):** Opus 5
**Status:** done
**Depends on:** [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)

## Scope

A capped, on-device record of sync outcomes, reachable from More, so that a sync failure the
indicator deliberately stays quiet about
([718](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)) still
leaves the user something to point at.

Without this, "quiet failure" means "invisible failure" and a user reporting _my podcasts aren't
updating_ has nothing to give support.

## Storage

A SQLite table under `apps/mobile/src/data/db/`, capped at **500 entries**, oldest evicted first.
Rows are small — the cap is about staying invisible in device storage, not about retention policy.

| Field         | Notes                                               |
| ------------- | --------------------------------------------------- |
| `occurred_at` | Timestamp                                           |
| `job_kind`    | The queue job identifier from 717                   |
| `outcome`     | `success` / `failure` / `skipped`                   |
| `error_code`  | Machine-readable code, when the failure carried one |
| `message`     | Human-readable detail                               |

Whether successes are recorded at all, or only failures and skips, is an implementation call — but
if successes are stored they must not crowd failures out of the 500. A log that evicted the only
failure because forty channels synced fine is useless.

## Error codes are the point

The displayed message is localized. A user quoting a Greek error string to support communicates
nothing, so **the stored entry must carry the machine-readable code** — HTTP status, API body code,
or an internal identifier — and the UI must show it.

This is the one hard requirement in this document. An entry with a translated sentence and no code
is not diagnosable.

Where the failure came from the API, reuse the existing helpers rather than re-deriving:
`getErrorResponseStatus` and `getErrorResponseBodyCode` from `@podverse/helpers/error`.

## Surface

A row in More opening a list screen, newest first. Each entry shows time, what was syncing, the
outcome, and the code when present.

Provide a way to get the contents out — copy to clipboard or share — since the purpose is handing
it to support. Include a clear action, since a user told to clear it is a user who has already had
the conversation.

This is a diagnostics surface, not a feature tour: plain, dense, and low in the More list. It does
not need an empty-state illustration.

## Accessibility

Per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc), each row reads
as a single coherent item — time, job, outcome, code — rather than four unlabeled fragments. Use
`FlatList` per [`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc); 500
rows is past the point where a `ScrollView` and `.map()` is acceptable.

## Acceptance criteria

- A failed sync job appends an entry with its error code; the indicator still shows nothing.
- The table never exceeds 500 rows, and eviction removes the oldest first.
- Failures are not evicted by a flood of successes.
- The log is reachable from More, newest first, and the contents can be exported.
- Clearing empties it.
- Unit tests cover the cap and eviction order, code extraction from a failure, and the retention
  rule protecting failures.

## As built

### Storage

`sync_event_log` (migration 7) in the mobile SQLite database, with an autoincrement `id` that also
serves as the tiebreaker for two entries sharing a millisecond — both newest-first display and
oldest-first eviction need a total order.

**Only failures and skips are written.** A single library pass settles dozens of jobs, so storing
successes would make 500 rows represent minutes of normal operation rather than months of problems,
and the entries worth keeping would be the ones squeezed out. Leaving them out means the cap can
only be reached by things that went wrong.

An offline failure is stored as `skipped`. The queue parks on unreachability rather than working the
rest of the run into the same wall, so an offline stretch produces roughly one entry per run, and
calling it a failure would report the user's train tunnel as a fault.

| Module | Role |
| ------ | ---- |
| `src/data/repositories/syncEventLog.ts` | Pure: cap, eviction rule, export format |
| `src/data/repositories/syncEventLogRepository.ts` | SQLite append / list / clear |
| `src/sync/syncEventLogSink.ts` | Bridges `syncQueue.subscribeToFailures` to the repository |
| `src/screens/more/MoreSyncLogScreen.tsx` | More ▸ Sync log |

The sink attaches from `SyncProvider` and changes nothing about how the queue treats a failure: it
still skips the job, finishes the run, and shows nothing. `append` swallows its own errors, since a
log that cannot be written is a worse thing to surface than the failure it was describing.

### Retention

`selectSyncEventEvictions` evicts oldest first but drops non-failures before it touches a failure, so
only a flood of *other failures* can push a failure out — which is a report in itself. The rule is
pure and unit-tested, and holds regardless of the decision not to store successes today.

Trimming reads `id` / `occurred_at` / `outcome` for every row and applies the rule in TypeScript
rather than expressing it a second time in SQL. At 500 narrow rows, on an event that only fires when
something failed, one source of truth is worth more than the query.

### Error codes

`classifySyncError` composes the HTTP status with the API body code when the body names its own
failure: `http_403:membership_required`, falling back to `http_403`. Picking one or the other loses a
question support would then have to ask. Extraction uses `getErrorResponseStatus` and
`getErrorResponseBodyCode` from `@podverse/helpers/error`.

The screen renders the code `selectable` and unmodified, and the share export repeats it on every
line alongside an ISO timestamp — the reader there is a support conversation, not the device owner,
so a locale-formatted `03/08` would be ambiguous.

### Surface

More ▸ Sync log, low in the list. `FlatList`, newest first, with share and clear (clear behind
`ConfirmDialog`). Export goes through the existing `Share.share` idiom rather than adding a clipboard
dependency; the share sheet offers Copy. Each row is one `accessible` node whose label reads job,
outcome, timestamp, code, and message in sequence.

Row timestamps use `Intl.DateTimeFormat` component options rather than `dateStyle` / `timeStyle`,
which are the parts of ECMA-402 Hermes has been least consistent about across platforms.

## Verification

`apps/mobile` is a standalone install outside the root npm workspaces, so root `test:unit` does not
reach its Vitest suite — run it with the `--prefix` form.

```bash
npm run mobile:lint
npm --prefix apps/mobile run test
npm run mobile:e2e:test -- sync-log
```
