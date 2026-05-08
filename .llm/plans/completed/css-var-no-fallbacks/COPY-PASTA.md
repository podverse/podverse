# CSS `var()` fallbacks — copy-pasta prompts

Execute plans from [`00-EXECUTION-ORDER.md`](./00-EXECUTION-ORDER.md). Mark each prompt complete here when
done.

## Prompt A — Podverse SCSS + Tooltip

Implement [01-podverse-scss-and-tooltip.md](./01-podverse-scss-and-tooltip.md): remove SCSS `var()`
fallbacks, map tokens as specified, update `Tooltip.tsx` for `--arrow-left` when `showArrow` is true,
optional `StatsBarChart.tsx` fill. Verify with `rg 'var\([^)]+,' --glob '*.scss'` from Podverse root.

- [x] Completed

## Prompt B — Metaboost SCSS

Implement [02-metaboost-scss.md](./02-metaboost-scss.md): strip fallbacks on `--color-border` in three
Metaboost `*.module.scss` files; optional Storybook line. Verify grep from Metaboost root.

- [x] Completed

## Prompt C — Governance

Implement [03-governance-rules-skills.md](./03-governance-rules-skills.md): add `css-custom-properties-no-var-fallbacks.mdc`
and skill cross-links in Podverse and Metaboost.

- [x] Completed

## After all prompts

- Move completed numbered files to `.llm/plans/completed/css-var-no-fallbacks/` per repo workflow.
- Update LLM history in `.llm/history/active/` for each repo touched.
