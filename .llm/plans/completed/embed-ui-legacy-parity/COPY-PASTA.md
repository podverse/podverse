# Embed UI legacy parity — Copy-Pasta

## Execution rules

- Run phases `01` → `05` in order.
- Do not run tests during agent execution; operator verifies at end.

---

## Phase 1 — completed

```text
Read and execute .llm/plans/completed/embed-ui-legacy-parity/01-shell-card-layout-and-heights.md

Unified embed card border, remove player panel overflow clipping, bump iframe/shell heights to 260/720.
```

## Phase 2 — completed

```text
Read and execute .llm/plans/completed/embed-ui-legacy-parity/02-player-info-artwork-typography.md

76px artwork, placeholder fallback, bold episode title, date pill styling.
```

## Phase 3 — completed

```text
Read and execute .llm/plans/completed/embed-ui-legacy-parity/03-progress-and-controls-parity.md

Embed-scoped full-width MediaPlayerProgress with visible desktop timestamps.
```

## Phase 4 — completed

```text
Read and execute .llm/plans/completed/embed-ui-legacy-parity/04-list-rows-legacy-layout.md

Remove list row thumbnails; play + text-only legacy rows.
```

## Phase 5 — completed

```text
Read and execute .llm/plans/completed/embed-ui-legacy-parity/05-e2e-docs-heights.md

Update embedAssertions, embed-routes E2E, EMBED-PLAYER.md, height constants.
```

---

## Cumulative verification (operator, after all phases)

```bash
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts,e2e/embed-demo-index.spec.ts
```

Manual: `/embed` and `/embed/podcast/<channel_id>` — compare to legacy screenshots.
