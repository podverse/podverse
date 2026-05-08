# CSS custom properties: remove `var()` fallbacks — summary

## Scope

Remove second-argument fallbacks from `var()` in SCSS across **Podverse** and **Metaboost**, map
non-canonical token names to real theme variables where fallbacks were masking gaps, adjust **Tooltip**
so arrow positioning does not rely on SCSS fallbacks, and add **Cursor rules + skill pointers** so
agents avoid reintroducing silent fallbacks.

## Repositories

- **Podverse:** `packages/ui`, `apps/web` (primary edits).
- **Metaboost:** `apps/web`, `apps/management-web` (three module SCSS files).

Metaboost governance files live under the Metaboost repo path referenced in `03-governance-rules-skills.md`.

## Plan files

| File | Purpose |
| --- | --- |
| [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) | Phase order and parallel notes |
| [01-podverse-scss-and-tooltip.md](./01-podverse-scss-and-tooltip.md) | Podverse token mapping + Tooltip.tsx |
| [02-metaboost-scss.md](./02-metaboost-scss.md) | Metaboost border fallbacks |
| [03-governance-rules-skills.md](./03-governance-rules-skills.md) | New rule + skill updates in both repos |
| [COPY-PASTA.md](./COPY-PASTA.md) | Copy-paste execution prompts |

## Decisions (locked)

- Do not use `var(--token, fallback)` in SCSS/CSS; missing tokens should fail visibly or be fixed at the
  theme layer.
- Podverse components that used invented names (`--font-size-heading`, `--color-text-muted`, etc.) map to
  existing tokens in `packages/ui/src/styles/_themes.scss` and `_variables-root.scss`, not new parallel
  names unless a token is genuinely missing and added canonically.
- Optional: align `StatsBarChart.tsx` `fill` attribute and Metaboost Storybook inline styles with the same
  policy (tracked as follow-ups in plan 01 / 02).

## Verification (after all phases)

- `rg 'var\([^)]+,' --glob '*.scss'` from Podverse and Metaboost roots → no matches.
- Optional: same grep over `*.tsx` for inline `var(..., ...)`.
- Spot-check UI: management tables (bulk bar, filter layout), sortable header focus ring, tooltip with
  arrow, media player like heart, stats chart; Metaboost bucket roles/messages borders.
