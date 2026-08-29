# Execution order — mobile-track16-prefs-settings

Run COPY-PASTA prompts **1 → 3** in order. All sequential (each builds on the prior).

## Phase 1 — sequential

1. **01** — Unified device prefs store (16.1). Foundation: single `getPref`/`setPref`/`hydratePrefs`
   API, distinct `pmt` playback key, wire `uit` to `ThemeProvider`. Refactor existing per-domain
   callers to the unified store.
2. **02** — Prefs server sync (16.2). Reconcile DB → device on login; push device → server for
   synced keys via existing `reqAccountSettings*Update` wrappers.
3. **03** — Settings screen (16.3) — final; archive set. Theme selector, locale picker, playback
   defaults, notification toggles; reuse 16.2 sync wrappers.

## Parallelism

None. 02 depends on the unified store + `pmt` key from 01; 03 reuses the sync wrappers from 02 and
the store from 01. Shared files (`apps/mobile/src/prefs/**`, auth hydrate hooks) make parallel runs
conflict-prone.

## After each prompt

- Mark `[x]` in `COPY-PASTA.md`.
- Flip affected master steps (Tracks section) + Appendix C + detail doc header to `done`.
- Track 16 still has no `(DONE)` marker after this set (16.1–16.3 complete, but do not add the
  track `(DONE)` heading — confirm all Track 16 steps are `done` first; 16.4–16.10 are already
  `done`, so once 16.1–16.3 flip, append ` (DONE)` to the `## Track 16 …` heading on the final prompt).
- Do **not** run tests during agent work; operator verifies at the end.
