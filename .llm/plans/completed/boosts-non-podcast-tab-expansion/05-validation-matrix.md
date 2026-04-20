# 05 Validation Matrix

## Lint
Run scoped lint for all touched files in `apps/web`.

## Manual Matrix
1. Artist page:
   - Eligible: Boost action visible, Boosts tab visible, messages load, post-boost refresh updates list.
   - Ineligible: action and tab hidden.
2. Album page:
   - Same checks as artist.
3. Track page:
   - Same checks as artist.
4. Livestream page:
   - Same checks as artist.
5. Videos surface:
   - If unsupported in this iteration, confirm explicit defer note exists and no accidental Boosts tab exposure.
6. Podcast/Episode regression:
   - Existing Boosts tab + refresh behavior still works.
7. Donate regression:
   - Existing `mb-v1` flow still works and message list refresh remains correct.

## Completion Criteria
- Lint passes on touched files.
- Matrix outcomes recorded.
- Any unsupported surfaces have explicit defer notes.
