# 03 — abcmemory rule: list virtualization baseline (future-proofing)

**Cursor model:** Codex 5.3
**Ship bar:** A committed abcmemory rule makes the `FlatList`/`SectionList` baseline the default for
new mobile list screens, so this optimization is enforced going forward — not a one-time cleanup.
Detail 597's inventory is confirmed accurate after steps 01–02.

## Why

Steps 01–02 fix today's screens. Without guidance, new screens can reintroduce `ScrollView` + `.map()`
for user-data lists. abcmemory (`.cursor/**`) is the mechanism the master plan uses to lock in
conventions (see the abcmemory-vocabulary rule and `llm-cursor-source`).

## Tasks

1. **Create `.cursor/rules/mobile-list-virtualization.mdc`** (glob-scoped to
   `apps/mobile/src/**/*.tsx`), concise:
   - User-data-driven / unbounded lists (subscriptions, playlist items, episodes, search results,
     queue) MUST use `FlatList` / `SectionList`, never `ScrollView` + `.map()`.
   - The list owns scroll: put headings/filters/header cards in `ListHeaderComponent`; do **not** nest
     a `FlatList` inside a `ScrollView` / `MobileScreenContainer`.
   - Grid: `numColumns` from `useResponsive().columns`; guard `columnWrapperStyle` on `columns > 1`;
     `key` changes with column count.
   - Small, fixed lists (chips, a handful of settings rows, bounded panels) may stay `.map()`.
   - Point at the reference (`HomeScreen.tsx`) and detail 597.
2. **Confirm detail 597 inventory** matches reality after 01–02 (flip Subscriptions / PlaylistDetail /
   PodcastDetail rows to ✅ compliant); fix any drift.
3. **Cross-reference**: add a one-line pointer to the new rule from `apps/mobile/AGENTS.md` (or the
   existing mobile list guidance) so contributors find it.
4. **Archive the set**: move all `mobile-list-virtualization/` files to
   `.llm/plans/completed/phase-1/mobile-list-virtualization/`, and update the master-plan 23.3 parenthetical
   to point at the completed path.

## Guards

- abcmemory edit = commit only `.cursor/**` for the rule (per `llm-cursor-source`); the operator
  commits. Keep the rule short and example-anchored (see `.cursor/skills/create-rule`).
- Do not restate the whole master plan in the rule — link to detail 597.

## Acceptance

- `.cursor/rules/mobile-list-virtualization.mdc` exists and is glob-scoped to mobile `.tsx`.
- Detail 597 inventory is accurate; AGENTS.md points at the rule.
- Set archived; master-plan 23.3 references the completed plan path.
