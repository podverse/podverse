# 05 — Sleep timer stub, share link, V4V boost entry stub

Implement master steps **11.12–11.14**.

## Detail docs

- [357-sleep-timer-optional](/docs/proposals/mobile/_master-plan_/details/357-sleep-timer-optional.md)
- [358-share-now-playing-link](/docs/proposals/mobile/_master-plan_/details/358-share-now-playing-link.md)
- [359-v4v-boost-entry-stub](/docs/proposals/mobile/_master-plan_/details/359-v4v-boost-entry-stub.md)

## Tasks

1. Sleep timer: optional stub entry on full player (simple timeout pause OK; incomplete allowed).
2. Share now-playing via OS share sheet when public URL exists; safe no-op otherwise.
3. V4V/boost entry stub gated by flavor/config; no full LNURL (Track 19); no non-compliant Play UX.
4. Mark **11.12–11.14** / **357–359** `done`.

## Acceptance

- Sleep unused does not regress playback
- Share/V4V never crash; V4V hidden when disallowed

Do not run tests during agent work.
