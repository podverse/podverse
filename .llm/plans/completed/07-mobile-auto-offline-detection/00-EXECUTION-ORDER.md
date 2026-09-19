# Execution order — automatic offline detection (779)

Prompts to paste: [COPY-PASTA.md](COPY-PASTA.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

| Step                                                      | What lands                                                  | Model     | Reasoning |
| --------------------------------------------------------- | ----------------------------------------------------------- | --------- | --------- |
| [01](01-connectivity-machine-and-store.md) Machine + store | Pure state machine, live store, health probe, unit tests    | Opus 5    | high      |
| [02](02-sensors-and-sync-wiring.md) Sensors + sync         | 5xx classification split, outcome reporting, NetInfo move   | Codex 5.3 | high      |
| [03](03-offline-status-and-banner.md) Status + banner      | `useOfflineStatus`, three-state banner, two i18n keys       | Codex 5.3 | medium    |
| [04](04-downloads-and-outbox-gating.md) Downloads + outbox | Pause / auto-resume, outbox replay gating                   | Codex 5.3 | high      |
| [05](05-e2e-docs-and-closeout.md) E2E, docs, closeout      | Maestro banner states, rule rewrites, master plan, archive  | Codex 5.3 | medium    |

## Why this order

- **01 before everything.** Nothing can read connectivity before the store exists, and the machine
  is the piece whose correctness every later step assumes. It also lands `isEffectivelyOffline()`,
  which 03 and 04 both consume.
- **02 before 03.** The banner must not be able to render a state that nothing produces. 02 is what
  actually feeds the machine its inputs, so after 02 the states are real and observable.
- **03 and 04 after 02.** Both depend only on 01 and 02, and they touch disjoint files. See the
  parallel note below.
- **05 last.** The Maestro flow asserts finished banner states, and the rule rewrites and master
  plan status flips should happen once, against the final behavior.

## Optional parallelism — 03 and 04

03 (banner, `useOfflineStatus`, i18n) and 04 (downloads, outbox) have no files in common and both
depend only on 01 and 02. They are a genuine two-agent opportunity.

Run them in parallel **only** if you are actually using two agents. If one agent is doing both, run
them in sequence — correctness is worth more than the wall-clock saving. If you do parallelize, each
prompt already names the files it owns and the files it must not touch, because agents cannot see
each other's prompts.

Neither one touches `COPY-PASTA.md` beyond its own checkbox, and only 03 touches the i18n catalog.

## The risk in this set

Step 01 is timers plus state: an entry debounce, a minimum dwell time, exponential backoff, and a
probe whose result races against new NetInfo events. Each is somewhere a naive implementation either
flaps the banner or wedges in the offline state forever. The acceptance bar is not "it detects
offline" — it is "a two-second subway blip shows the user nothing, and NetInfo lying about a captive
portal does not clear the strip".

The second risk runs through the whole set: **auto-offline must never become a stricter gate than
intended.** If any step starts refusing requests because the app believes it is offline, the app
loses its only means of discovering it is back. Every gate here is either pref-only or explicitly
probe-permitting. Remote streaming in particular stays allowed under auto-offline.

## Hard dependencies

None outside this set. `GET /api/v2/health` already exists and is already unauthenticated
([`registerHealthRoutes.ts`](/apps/api/src/lib/health/registerHealthRoutes.ts)), and
`@react-native-community/netinfo` is already installed and already in the prebuilt dev client.

No native rebuild is required for this set.

## Cross-surface note

Mobile-only. No API, ORM, DTO, or OpenAPI work. No persisted DTO field changes, so no device-data
migration, and no new SQLite migration. Web has no counterpart and intentionally stays without one.

## Not in this set

Mobile brand-name config and `{brand_name}` interpolation, wifi-only / metered download policy, and
any account-synced representation of connectivity. See
[00-SUMMARY.md](00-SUMMARY.md) § Not in this set.
