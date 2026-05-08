# CSS `var()` fallbacks — execution order

Run phases in order. Phases **01** and **02** may be executed in parallel by two agents if desired (no
file overlap). Phase **03** touches both repos’ `.cursor/` and should run after or alongside 01/02 if
merge conflicts are avoided (prefer sequential 01 → 02 → 03 if unsure).

1. **[01-podverse-scss-and-tooltip.md](./01-podverse-scss-and-tooltip.md)** — Podverse SCSS edits +
   `Tooltip.tsx` arrow default; optional `StatsBarChart.tsx` fill.
2. **[02-metaboost-scss.md](./02-metaboost-scss.md)** — Metaboost three `*.module.scss` files; optional
   Storybook cleanup.
3. **[03-governance-rules-skills.md](./03-governance-rules-skills.md)** — New `.mdc` rule in Podverse and
   Metaboost; extend `styles-source-of-truth` (Podverse) and `global` or `reusable-components` (Metaboost).

After implementation, run verification grep and update **COPY-PASTA.md** checkboxes per
Metaboost [plan-execution-completion-tracking](../../../../.cursor/rules/plan-execution-completion-tracking.mdc)
(when working in Metaboost) / Podverse plan lifecycle: mark prompts complete, move numbered files to
`.llm/plans/completed/css-var-no-fallbacks/` when done.

Prompts to paste: [COPY-PASTA.md](./COPY-PASTA.md).
