# COPY-PASTA — Media player Space shortcut

Use these prompts when you want implementation work done. Run in order. Verify after each
step before proceeding.

## Step 1 — Unify Space toggle with PlayButton ✅

```text
Execute the plan in .llm/plans/active/media-player-space-shortcut/01-space-toggle-set-mp-is-playing.md. Make the code changes and tests described there.
```

## Step 2 — Focus main content on benign click ✅

```text
Execute the plan in .llm/plans/active/media-player-space-shortcut/02-main-wrapper-focus-on-mousedown.md. Make the code changes and tests described there.
```

## Step 3 — Keyboard guard hardening (optional) ✅

```text
Execute the plan in .llm/plans/active/media-player-space-shortcut/03-keyboard-guard-hardening.md. Make the code changes and tests described there.
```

## Final verification request (after all steps are done)

```text
Now that all media-player-space-shortcut plan steps are complete, provide the cumulative verification commands for this full plan set.
```

Expected cumulative commands (operator runs from repo root):

```bash
npm run lint
npm run build:packages
npm run build -w apps/web
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-space-shortcut.spec.ts
make e2e_test_web_report_spec SPEC=e2e/media-player-keyboard-shortcuts.spec.ts
```

If plan 03 was executed, also run any new specs added there (see plan 03 verification
section).

Open `.artifacts/e2e-reports/latest/web/index.html` after each report run to review step
screenshots.
