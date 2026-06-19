# COPY-PASTA — Floating video player + modal video

Use these prompts when you want implementation work done. Run in order. Verify the UI after
each step before proceeding.

## Step 1 — Default appearance (completed)

```text
Execute the plan in .llm/plans/completed/floating-video-player/01-floating-video-default-appearance.md. Make the code changes and tests described there.
```

## Step 2 — Draggable (completed)

```text
Execute the plan in .llm/plans/completed/floating-video-player/02-floating-video-draggable.md. Make the code changes and tests described there.
```

## Step 3 — Resizable (completed)

```text
Execute the plan in .llm/plans/completed/floating-video-player/03-floating-video-resizable.md. Make the code changes and tests described there.
```

## Step 4 — Modal video (completed)

```text
Execute the plan in .llm/plans/completed/floating-video-player/04-modal-video-center.md. Make the code changes and tests described there.
```

## Final verification request (after all steps are done)

```text
Now that all floating-video-player plan steps are complete, provide the cumulative verification commands for this full plan set.
```

Expected cumulative commands (operator runs from repo root):

```bash
npm run lint
npm run build:packages
npm run build -w apps/web
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-floating-video-default.spec.ts
make e2e_test_web_report_spec SPEC=e2e/media-player-floating-video-resize.spec.ts
make e2e_test_web_report_spec SPEC=e2e/media-player-modal-video.spec.ts
```

Open `.artifacts/e2e-reports/latest/web/index.html` after each report run to review
step screenshots.
