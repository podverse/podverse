# 03 — Phone Home FlatList visual confirm (regression guard)

**Cursor model:** Codex 5.3
**Ship bar:** The phone Home layout after the `ScrollView → FlatList` refactor is confirmed
intentional and locked (comment or restored wrapper); the `home` E2E stays green.

## Why

The tablet grid work changed `HomeScreen` from a `ScrollView` to a `FlatList` with `numColumns`.
Two side effects reach the **phone** (single-column) path, which is the primary Home surface:

- Feed rows moved **out of** the `feedCard` wrapper. Previously the title/filter/summary **and** the
  rows lived inside one card; now the card wraps only the header (`ListHeaderComponent`) and rows
  render below it as list items.
- The list now virtualizes, and `key={`cols-${columns}`}` remounts on column change (scroll reset on
  rotation).

`home` E2E passes and a phone screenshot exists, so this is low risk — but the visual change to the
main screen should be a **deliberate, documented** choice, not an accidental byproduct.

## Context (read first)

- `apps/mobile/src/screens/home/HomeScreen.tsx` — `listHeader` (in `feedCard`), `renderItem`
  (`columnCell`), `ListFooterComponent`, `key={`cols-${columns}`}`, `numColumns={columns}`,
  `columnWrapperStyle` guarded on `columns > 1`.
- Existing phone screenshot: latest `home` slot report
  (`.artifacts/mobile-e2e-reports/latest/ios-phone/…` / `android-phone/…`) and any
  `home`-flow `takeScreenshot` output.

## Tasks

1. **Confirm intent (operator eyeball).** Compare the current phone Home screenshot against the
   pre-refactor look (rows inside the card). Decide: is "header-in-card, rows-below" intended?
2. **Lock the outcome in code:**
   - **If intended (expected):** add a short comment in `HomeScreen.tsx` above the `FlatList`
     explaining that the header stays in `feedCard` while rows render as list items (grid needs
     `FlatList`/`numColumns`), so the layout is understood as deliberate — not a regression to
     "fix" later. No behavior change.
   - **If NOT intended:** wrap the list body so phone (single-column) rows visually sit within the
     card again (e.g. card-styled `contentContainerStyle`/background for `columns === 1`), keeping
     the grid path (`columns > 1`) unchanged. Keep it minimal — no redesign (Track 23 hard stop).
3. **Guard scroll-reset (only if it matters):** if rotation scroll-reset is deemed a problem, note it
   for Track 23 rather than fixing here; do not add complexity in this hardening pass.

## Guards / gotchas

- Do **not** change the tablet grid path or `numColumns` logic.
- Keep `columnWrapperStyle` guarded on `columns > 1` (RN throws if set when `numColumns === 1`).
- No new deps; no redesign; this is a confirm-and-lock task, not a feature.

## Acceptance

- Phone Home intent is explicit in code (documented comment or restored card wrapper for the
  single-column path).
- `npm run mobile:e2e:test -- home` stays green on both phone slots; the phone Home screenshot
  matches the agreed intended layout.
