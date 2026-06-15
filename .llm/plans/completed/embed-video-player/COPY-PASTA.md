# Embed Video Player — Copy-Pasta

## Execution rules

- Read [`00-SUMMARY.md`](./00-SUMMARY.md) before Phase 1 for locked decisions and query contracts.
- Run phases in strict sequence: `01` → `06`.
- Do not start the next phase until the previous phase acceptance criteria are met.
- Keep `_embedLayoutTokens.scss` and `embedLayoutTokens.ts` in sync on every layout change.
- Scope: `apps/web` + `docs/features/EMBED-PLAYER.md`.
- Add tests during each phase; do not run verification commands during agent execution.

---

## Phase 1

```text
Read and execute .llm/plans/active/embed-video-player/01-layout-tokens-and-responsive-single.md

Add aspect-ratio tokens, ar query param, responsive single-video shell, responsive iframe wrapper in
buildEmbedIframeCode, and builder aspect ratio control. Do not implement playback or overlays yet.
```

## Phase 2

```text
Read and execute .llm/plans/active/embed-video-player/02-video-media-mount-and-playback.md

Implement EmbedVideoMediaMount (inline video + audio-with-center-art), enable video playback load for
single and list embeds, and fix embedPlayerContentReady for real video readiness.
```

## Phase 3

```text
Read and execute .llm/plans/active/embed-video-player/03-video-overlays-info-controls-chapter.md

Implement EmbedVideoStage overlays (info + controls), auto-hide on idle, chapter title line above
controls, and progress-bar chapter popover for video embed only.
```

## Phase 4

```text
Read and execute .llm/plans/active/embed-video-player/04-list-count-and-video-list-fixed.md

Add rows query param (2-10, default 5), builder control, rows-based list height CSS vars, and fixed
deterministic video+list shell heights.
```

## Phase 5

```text
Read and execute .llm/plans/active/embed-video-player/05-video-list-autoresize-advanced.md

Implement opt-in secure postMessage auto-resize for video+list embeds (resize=1), builder advanced
toggle, and parent listener snippet generation. Default remains fixed heights from Phase 4.
```

## Phase 6

```text
Read and execute .llm/plans/active/embed-video-player/06-tests-e2e-and-docs.md

Add unit tests, Playwright E2E for video embed UX, update EMBED-PLAYER.md, and remove video
placeholder from production paths.
```

---

## Cumulative verification (after all phases)

```bash
npm run lint
npm run test:unit
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-video-player.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-share-builder.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
```

Review screenshot reports at `.artifacts/e2e-reports/latest/web/index.html`.

Operator docs: `docs/features/EMBED-PLAYER.md`.

---

## Plan archival

When Phase 6 is complete, move the entire directory from
`.llm/plans/active/embed-video-player/` to `.llm/plans/completed/embed-video-player/` per the
**plan-completion** skill.
