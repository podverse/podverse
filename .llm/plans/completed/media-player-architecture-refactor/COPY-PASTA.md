# Media player architecture refactor — copy-pasta

Use one block at a time when executing this initiative. Mark
checkboxes as you complete each step. Each numbered step is a logical
commit (or a small commit series) on `refactor/media-player`; CI must
stay green at every commit.

- [x] **Phase 0 — branch setup**

  Create the long-lived refactor branch off latest `develop`:

  ```bash
  git fetch origin
  git switch develop
  git pull --ff-only
  git switch -c refactor/media-player
  ```

- [x] **Phase 1 — behavior baseline and test harness**

  Execute
  [`01-behavior-baseline-and-test-harness.md`](./01-behavior-baseline-and-test-harness.md):
  write the decision matrix doc (including the **required** live-stream /
  video.js baseline appendix in section 6 — regression oracle for this
  refactor and baseline for the future HLS plan-set), build the fake
  `HTMLMediaElement` harness, write orchestration tests against current
  behavior, fill the E2E gaps (including the four live-stream specs so
  every later phase proves livestream behavior is unchanged), extend
  pure-helper coverage. No production code changes.
  Commit per deliverable. Verify:

  ```bash
  npm run test:unit
  make e2e_test_web_report
  ```

- [x] **Phase 2 — playback domain types**

  Execute [`02-playback-domain-types.md`](./02-playback-domain-types.md):
  add `apps/web/src/lib/playback/` with `PlaybackTarget`,
  `PlaybackLoadRequest`, and pure sub-helpers plus tests. Verify
  nothing in production imports the new modules yet. Verify:

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  ```

- [x] **Phase 3a — load policy + new MediaPlayer context shape (no consumers yet)**

  Execute
  [`03a-policy-design-and-context-shape.md`](./03a-policy-design-and-context-shape.md):
  implement `resolvePlaybackLoadDecision` with full unit tests; add
  the new `MediaPlayer` context fields without removing legacy fields;
  refactor `useQueueResourcesLoadActive` to additionally return
  `LoadActiveResult`. Run the ripgrep audit for
  `setActiveQueueUpcomingResources` consumers. Verify:

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  ```

- [x] **Gate — seed-expansion plan-set complete**

  *(Satisfied on `refactor/media-player`: the
  [`media-player-e2e-seed-expansion`](../../completed/media-player-e2e-seed-expansion/)
  plan-set is executed, archived under `completed/`, and the six
  lifted specs are green on this branch. Merge to `develop` is still
  pending with the rest of this branch — treat the gate as “oracles
  ready here,” not “already on `develop`.”)*

  Phase 3b rewires the six non-livestream consumers (podcast, music,
  clip, soundbite, chapter, add-by-RSS). The page-level oracles for
  those consumers live in the
  [`media-player-e2e-seed-expansion`](../../completed/media-player-e2e-seed-expansion/)
  plan-set. Do **not** begin Phase 3b until that plan-set has merged
  on `develop` and its six lifted specs are green there, **or** until
  you explicitly accept the regression risk in writing on this gate
  (document the rationale here and proceed with weaker page-level
  coverage). The Phase 1 livestream audio-start spec and Phase 1
  orchestration tests are sufficient oracles for Phases 2, 3a, 4, and
  5; only Phase 3b depends on this gate.

- [x] **Phase 3b — consumer migration; delete superseded helpers**

  *Delivered:* consumers use `MediaPlayerPlaybackLoadInput` + `playbackTargetFromStandardLoad`;
  `resolvePlaybackLoadDecision` owns near-end clamp. **Commit 4** (queue head watch) lives in
  `useMediaPlayerControllerQueueHeadLoading.ts` (same reactions as the former controller effect).
  **Commit 8** (`NonLiveMediaOrchestrator` / bridge `onLoadedMetadata` policy-only slim) remains optional polish; staged decision path
  already runs in `onLoadedMetadata` via `bridge.seek` / `pauseAt`. Superseded helper files from
  commit 9 are absent.

  Execute [`03b-consumer-migration.md`](./03b-consumer-migration.md):
  one commit per migration step as documented there. Page-level
  oracles for these consumers come from the seed-expansion plan-set
  above; if the gate was waived, document the regressions you accept
  in the commit message of this phase. Verify:

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [x] **Phase 4a — bridge API + controls context + element contract**

  *Delivered:* bridge + controls context + `NonLiveMediaMount` wiring + 4c UI migration; add-by-RSS
  URL sync + regular enclosure surface changes use `bridge.syncHttpFileUrlRestoreSeekAndPlay` /
  `bridge.applyItemEnclosureSurfaceChange` (implementations in `mediaElementBridgeSurface.ts`).
  *Follow-up (optional polish):* further shrink `NonLiveMediaOrchestrator.tsx` by extracting
  focused hooks (same behavior; smaller files).

  Execute [`04a-bridge-api-and-element-architecture.md`](./04a-bridge-api-and-element-architecture.md):
  add `useMediaElementBridge` (file sources only; no HLS); add
  `MediaPlayerControlsContext` and provider; scaffold `<MediaElement>`
  and `mediaElementSourceFromTarget`; rewire **regular** audio + video
  controllers to use the bridge. **Do not** rewire livestream
  controllers. Verify:

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [x] **Phase 4b — unified `<MediaElement>` for regular audio + video**

  **Done:** `NonLiveMediaMount` + `useNonLivePlaybackAvProps` replace the split
  `MediaPlayerControllerAudio` / `MediaPlayerVideoWrapper` /
  `MediaPlayerControllerVideo` tree; those three files are deleted;
  `MediaPlayerController` mounts `<NonLiveMediaMount />`. **`MediaElement.tsx`**
  is the active `<audio>` / `<video>` DOM shell; **`MediaPlayerControllerAV.tsx`**
  is removed in favor of **`NonLiveMediaOrchestrator.tsx`** (bridge + effects).
  *Incremental vs original 04b doc:* `mediaElementSourceFromTarget(PlaybackTarget)`
  can still grow as remaining call sites converge on a single `target` prop.

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [x] **Phase 4c — UI consumer migration; remove `MEDIA_PLAYER` event group**

  All producers use `useMediaPlayerControls()` + `setMPCurrentTime` where
  needed; window listeners removed from `NonLiveMediaOrchestrator`;
  `apps/web/src/constants/events.ts` deleted. Keyboard path uses
  `seekWithUiSync` + `togglePlay` from the bridge context.

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [x] **Phase 5 — controller slim-down + ESLint guards**

  - `MediaPlayerController.tsx` is a thin coordinator (**&lt;250 lines**); queue
    head / auto-queue reactions live in
    `apps/web/src/hooks/useMediaPlayerControllerQueueHeadLoading.ts`.
  - Root `eslint.config.mjs`: **`no-restricted-syntax`** bans assignments and
    `load` / `play` / `pause` / `removeAttribute` on `mediaRef.current` under
    `apps/web/src/**`, with ignores only for `useMediaElementBridge.ts` and
    `mediaElementBridgeSurface.ts` (imperative bridge implementation).
  - `useMediaElementBridge.ts` &lt;350 lines (surface helpers split to `mediaElementBridgeSurface.ts`);
    `MediaElement.tsx` &lt;150 lines (DOM shell only).

  ```bash
  wc -l \
    apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx \
    apps/web/src/components/MediaPlayer/MediaElement/MediaElement.tsx \
    apps/web/src/hooks/useMediaElementBridge.ts \
    apps/web/src/hooks/mediaElementBridgeSurface.ts
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [x] **Phase 6 — skill docs and merge** *(docs only; merge is manual)*

  Added [`.cursor/skills/media-player-architecture/SKILL.md`](../../../../.cursor/skills/media-player-architecture/SKILL.md)
  and linked it from [`apps/web/AGENTS.md`](../../../../apps/web/AGENTS.md).
  **Still on you:** scratch-branch synthetic lint check (temporarily add
  `mediaRef.current.load()` outside the bridge modules → expect ESLint
  failure), full QA matrix, PR, merge, then plan archival block below.

- [x] **Executable initiative (Phases 0–6 on branch)**

  All scoped refactor work for this plan-set is implemented on
  `refactor/media-player`. What remains is **human / Git** (PR, merge,
  optional synthetic ESLint check) and the **post-merge directory move**
  below — not additional architecture commits on this checklist.

- [x] **Post-merge: archive this plan-set directory**

  Archived under `.llm/plans/completed/` (merge gate overridden per
  maintainer decision; livestream/HLS remains a separate plan-set).
  Original command for reference:

  ```bash
  mv .llm/plans/active/media-player-architecture-refactor \
     .llm/plans/completed/media-player-architecture-refactor
  ```

- [ ] **Next initiative — livestream / HLS (separate plan-set)**

  Expand and run
  [`../media-player-livestream-hls-migration/`](../media-player-livestream-hls-migration/)
  when folding livestreams into `<MediaElement>` and retiring
  `video.js` is prioritized. That plan-set is placeholder-level until
  expanded. It is **independent** of the post-merge `mv` for this
  plan-set directory above.
