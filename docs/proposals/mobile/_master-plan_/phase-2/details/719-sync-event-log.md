# 719-sync-event-log

**Master step:** P2.4.10
**Model (author + implement):** Opus 5
**Status:** planned
**Depends on:** [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)

## Scope

A capped, on-device record of sync outcomes, reachable from More, so that a sync failure the
indicator deliberately stays quiet about
([718](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)) still
leaves the user something to point at.

Without this, "quiet failure" means "invisible failure" and a user reporting *my podcasts aren't
updating* has nothing to give support.

## Storage

A SQLite table under `apps/mobile/src/data/db/`, capped at **500 entries**, oldest evicted first.
Rows are small — the cap is about staying invisible in device storage, not about retention policy.

| Field        | Notes                                                            |
| ------------ | ---------------------------------------------------------------- |
| `occurred_at` | Timestamp                                                        |
| `job_kind`   | The queue job identifier from 717                                |
| `outcome`    | `success` / `failure` / `skipped`                                |
| `error_code` | Machine-readable code, when the failure carried one              |
| `message`    | Human-readable detail                                            |

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

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- settings-select
```
