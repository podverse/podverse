# 597-list-virtualization-polish

**Master step:** 23.3
**Model (author + implement):** Codex 5.3
**Status:** draft

## Scope

- Optional: FlashList / FlatList tuning **only if** operator flags jank on long lists.
- Not required for MVP feature tracks (FlatList/SectionList sketches are enough).

## Acceptance criteria

- Only lists called out in operator notes are changed
- Scroll performance improved or documented as WONTFIX with reason
- No unrelated UI redesign

## Web parity references

- N/A (platform performance)

## Verification

Manual scroll on largest feeds (Home, History, Search) after change.
