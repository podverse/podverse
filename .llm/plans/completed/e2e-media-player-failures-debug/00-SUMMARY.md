# E2E media-player failures debug — summary

One-off debug pass for failing web E2E specs across six media-player
Playwright files (strict-mode title locators, chapter Play XPath,
`loadedmetadata` / `readyState` gating, HTTP Range on the local asset
server, cross-queue cleanup for chapter-seed leakage, music auto-queue
seed `pub_date` ordering, `handleLoadedMetadata` near-end clamp parity
with `useMediaPlayerResourceUpdate`, and podcast-resume re-promotion
after broad queue cleanup).

**Primary evidence and narrative:** see
[`.llm/history/active/e2e-media-player-failures-debug/01-diagnostic-clip-test-1.md`](../../history/active/e2e-media-player-failures-debug/01-diagnostic-clip-test-1.md)
(appendix covers Phases 2–4 follow-ups).

This plan-set was executed on branch `refactor/media-player`; there was
no separate numbered file tree under `.llm/plans/active/` during
execution (Cursor plan file only).
