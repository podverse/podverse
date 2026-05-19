# Phase 6 — Skill docs and merge

## Goal

Document the new architecture so the next contributor finds the right
abstractions before adding a playback flow, run final QA, and merge.

ESLint: Phase 5 adds `no-restricted-syntax` for direct `mediaRef`
writes outside the bridge. Phase 6 verifies that rule on `develop`.
**No** `video.js` import ban in this plan-set (see HLS follow-up).

## Scope

`.cursor/skills/media-player-architecture/` (new),
[`apps/web/AGENTS.md`](../../../../apps/web/AGENTS.md).

## Deliverables

### 1. Architecture skill

`.cursor/skills/media-player-architecture/SKILL.md`

Covers:

- `PlaybackTarget`, `PlaybackLoadRequest`, `resolvePlaybackLoadDecision`
  (safe-default music intent; `explicitPlaybackSeconds` precedence).
- `useMediaElementBridge` for **file-based** non-live `<audio>` /
  `<video>` only; invariant that nothing outside the bridge writes
  `mediaRef.current` (ESLint in Phase 5).
- `MediaPlayerControlsContext` and `isAttached: false` during
  livestream playback (legacy path; seek/jump no-op parity with today).
- Single `<MediaElement>` for **non-live** targets; permanent
  `LegacyLiveStreamControllerSelector` until
  [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/).
- Where to add a new **non-live** playback flow vs. when livestream work
  belongs in the HLS plan-set.
- Music session-restore end-to-end (anonymous snapshot → request →
  policy → bridge `loadAndStart`).

Include a small mermaid diagram aligned with
[`00-SUMMARY.md`](./00-SUMMARY.md).

### 2. ESLint guard (verify)

- `npm run lint -w apps/web` is clean on the merged commit.
- Scratch-branch: add `mediaRef.current.currentTime = 0` outside the
  bridge; lint must fail. Discard branch.
- **Do not** verify a `video.js` import ban here.

### 3. AGENTS.md update

Link the skill from a "Media player" subsection.

### 4. Final QA matrix

Manual sweep against the Phase 1 matrix:

- Music flows (restore, explicit, track-ended, skip-next, autoQueue).
- Podcast / video resume; clip / soundbite / chapter end-time stop.
- Add-by-RSS resume.
- **Livestream audio play** — verify unchanged vs. pre-refactor
  (video.js path).
- **Livestream video play** — verify unchanged (floating portal).
- Keyboard shortcuts on non-live sources.

**Deferred to HLS plan-set:** live ↔ non-live transition regression
hunting beyond parity with today's video.js path; Safari native HLS
chunk verification; removing `video.js`.

### 5. Branch hygiene before merge

Rebase, PR "Refactor media player architecture", reference this plan-set.

### 6. Plan-set archival

After merge, move this directory to `completed/` per Plan Lifecycle.

### 7. Next initiative

Open or expand
[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
when ready to retire `video.js` and fold livestreams into
`<MediaElement>`.

## Exit criteria

- Skill exists; `AGENTS.md` links it.
- `no-restricted-syntax` bridge guard passes; synthetic `mediaRef`
  write fails lint.
- Full `make e2e_test_web_report` green on merged commit.
- `package.json` still includes `video.js` (pinned as today); no
  `hls.js` added by this plan-set.
- Plan-set moved to `completed/`.

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit
make e2e_test_web_report
```
