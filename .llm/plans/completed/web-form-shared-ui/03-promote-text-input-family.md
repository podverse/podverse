# 03 — Promote TextInput family

## Prompt (Agent)

Execute **phase 03**: promote TextInput, TextInputNumber, TextInputNumberIncrements, and
TextInputHHMMSS into `packages/ui`; keep props copy-free; preserve web layout and interaction; add
Vitest coverage for non-trivial behavior (e.g. increment bounds, time parsing) where risk warrants.

## Dependencies

- [`Button`](../../../../packages/ui/src/components/button/Button/Button.tsx) is already imported by
  web `TextInput`; keep importing from `@podverse/ui` **within** `packages/ui` via relative paths to
  avoid circular package imports — follow existing ui internal import patterns.
- **`react-icons`**: already a `packages/ui` dependency — FaSpinner and similar are allowed.

## TextInput props

Preserve the public API used across web (Auth, Settings, Boost, Modals, Clip, Playlist, etc.):

- Controlled `value` / `onChange` string pattern.
- Optional **eyebrow**, **info**, **infoError** (strings from app).
- **suffix** / **prefix**, **button** / **buttonIcon**, numeric **min**/**max**/**step**, **onWheel**
  suppression where implemented.

## TextInputNumber / Increments / HHMMSS

- Move implementation + SCSS together; keep numeric filtering and HHMMSS segment behavior identical
  to web to avoid regressions in Clip edit and other flows.

## Testing focus

- HHMMSS: valid transitions, boundary behavior, paste handling if any.
- Number increments: clamping vs min/max.

## Risk notes

This phase touches the **largest** share of web call sites — coordinate with phase 05 if doing a
single branch: implement in `packages/ui` first, then switch imports in one migration pass to reduce
intermediate breakage.
