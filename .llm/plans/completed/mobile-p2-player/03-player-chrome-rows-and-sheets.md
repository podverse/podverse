# 03 — Player chrome rows and sheets

Decisions 9–17 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[749](/docs/proposals/mobile/_master-plan_/phase-2/details/749-player-action-rows-and-more-sheet.md)

Three fixed-height rows and the sheets they open. Do this before the scroll shell: the fixed region in
step 04 only holds if nothing on the screen can still expand inline.

## Components

Each row is a component under `apps/mobile/src/components/player/`, presentational, taking handlers
from the screen. Every row is one fixed height regardless of what is playing.

### `FullPlayerActionRow`

Dismiss, create clip, add to playlist, share, queue, and — only when the item has value tags and the
V4V config gate is on — the V4V entry. Icon-only buttons with real `accessibilityLabel`s; a `testID`
is not a label ([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

Add to playlist, share, and queue call the same code paths episode detail and the media rows already
use. Search before writing — the sheet, the share handler, and the queue mutation all exist
([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

**Create clip is a placeholder that answers when pressed.** It looks and behaves like the other icons;
pressing it shows a short "not available yet" message and changes nothing — no disabled styling, no
caption, no state, no request
([`deferred-feature-placeholders`](/.cursor/rules/deferred-feature-placeholders.mdc)). Use a single
acknowledge dialog: if `ConfirmDialog` cannot yet express one action, extend it rather than adding a
second modal component. One shared i18n string for the message, sentence case.

### `FullPlayerTransportRow`

Previous, −10, play/pause, +30, next. Play/pause is the existing `PlayerTransportButton` at `lg` —
it already carries loading and error/retry, so do not re-implement that here. Previous and next call
`skipToPrevious` and the existing next-item action; the jump buttons call `jumpBy` with the shared
constants and label their seconds from those same constants.

Disable next when the queue has nothing after the current item. Previous is never disabled — it always
has somewhere to go, even if that is the start of the file.

### `FullPlayerUtilityRow`

Sleep timer, playback speed, More. Each opens a sheet.

### `FullPlayerMoreSheet`

`MoreMenu`, legacy parity: Subscribe / Unsubscribe, Mark as played / unplayed, Cancel. Both use the
existing mutations and their existing membership gates — do not invent new gate copy
([`generic-login-required-copy`](/.cursor/rules/generic-login-required-copy.mdc)). No create-clip row
here; the placeholder lives on the icon that owns the affordance.

## Convert the inline panels to sheets

Sleep timer, playback speed, and Up next currently expand inside the screen. Move each into a
`MoreMenu` sheet and delete the inline panel state and styles. This is the change that makes the fixed
region possible — an inline panel resizes the player region every time it opens, which is exactly what
decision 2 forbids.

Keep the behavior identical while moving it: the same durations, the same rates, the same up-next list.
Behavior changes belong in their own step, not smuggled into a container swap.

## Tests

Row rendering is thin; the risk is in what the rows decide, so test that
(**unit-test-design-no-overgranularity** — do not snapshot five buttons):

- Next is disabled with an empty upcoming queue and enabled with one item.
- The V4V entry appears only when the item has value tags and the gate is on.
- Jump labels read from the shared constants, so the label cannot drift from the seek.

## Out of scope

No layout math, no scrolling, no chips. The screen still renders its current single-screen body; step
04 rearranges it.
