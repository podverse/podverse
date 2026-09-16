# 02 — Previous and jump transport

Decisions 12–13 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[748](/docs/proposals/mobile/_master-plan_/phase-2/details/748-player-transport-parity.md)

Engine work and pure resolvers. No buttons — the transport row arrives in step 03 and needs these to
exist first, or it ships with dead controls.

## Shared jump interval — mobile and web

`MEDIA_JUMP_BACK_SECONDS` in `packages/helpers/src/lib/timeConstants.ts` changes **15 → 10**.
`MEDIA_JUMP_FORWARD_SECONDS` stays 30. Mobile imports both rather than defining its own.

Web's four jump buttons (`JumpBackButton`, `JumpBackButtonMobile`, and the forward pair) already read
the constant and interpolate it into their `aria-label`, so web changes with this edit and needs no
component work. No web E2E asserts the old "15 seconds" label — verify, do not assume, and if one has
appeared since, update it here rather than leaving web red.

This is deliberate cross-surface scope: the operator asked for 10 back / 30 forward on both surfaces,
so the constant moves once instead of mobile forking its own value
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

## `PlaybackProvider` additions

### `skipToPrevious()`

Chapter-aware, matching what listeners expect from every other player:

- Outside a short grace window from the current chapter's start → seek to that chapter's start.
- Inside the grace window and a previous chapter exists → jump to its start.
- Inside the grace window with no previous chapter, or no chapters at all → previous queue item if one
  exists, otherwise seek to zero.

Chapters come from the same source the segment bar already uses, so the player and
`NowPlayingSegmentBar` cannot disagree about which chapter is current.

### `jumpBy(deltaSeconds)`

Seek relative to the live position, clamped to the playable range. For a clip or bounded target the
bounds are the clip's, not the file's — jumping forward inside a 40-second clip must not escape it.
For a live stream with no known duration, forward jumps clamp to the live edge.

Both go through the existing seek path so position reporting, the progress bar, and remote/lock-screen
controls stay consistent. Do not add a second seek route.

## Pure resolvers

Extract the decisions so they are testable without an engine:

- **`resolvePreviousAction(input)`** → a discriminated result (`seek-chapter-start`,
  `seek-previous-chapter`, `previous-queue-item`, `seek-zero`) from position, chapters, and whether a
  previous queue item exists.
- **`resolveJumpTarget(input)`** → the clamped absolute target from position, delta, and bounds.

Discriminated results, not booleans, so a caller cannot silently mishandle a case
([`avoid-type-assertions`](/.cursor/rules/avoid-type-assertions.mdc)).

## Tests

Alongside the existing `playbackTransport.test.ts`:

- Previous: mid-chapter restarts the chapter; just-after-start steps back a chapter; first chapter with
  a previous queue item goes to that item; first chapter with an empty queue seeks zero; no chapters
  falls through to the queue rule.
- Jump: clamps at zero and at duration; clamps to clip bounds for a bounded target; forward on an
  unknown-duration live target does not produce `NaN` or a target past the live edge.

## Out of scope

No UI. No jump-interval preference and no player settings screen — the interval is a shared constant
until the operator asks for one. Do not touch `PlayerTransportButton`; it already owns play/pause,
loading, and retry.
