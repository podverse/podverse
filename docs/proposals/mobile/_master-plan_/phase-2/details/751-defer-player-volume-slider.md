# 751-defer-player-volume-slider

**Master step:** P2.3.19
**Model (author + implement):** Auto
**Status:** deferred

## Scope

- **Defer** the player More-sheet **device volume slider** that the previous-generation app shows
  between "Mark as Played" and "Cancel".
- The rest of that sheet ships now — [749](749-player-action-rows-and-more-sheet.md).

## Why it is deferred rather than built

Expo exposes no system-volume API. Reading and writing OS volume needs a native module (legacy used
`react-native-system-setting`), which means a config plugin, an iOS and Android prebuild, and a
dev-client rebuild for every contributor — a disproportionate cost for a control the hardware volume
buttons already provide.

Nothing about the sheet is shaped around it: adding a row later is a row, not a redesign.

## Acceptance criteria

- No volume row, disabled or otherwise, in the player More sheet.
- No volume preference, storage key, or module dependency added in anticipation.
- Reopened only when the operator asks for it, at which point it arrives with the native module rather
  than a placeholder.

## Verification

N/A (deferral stub).
