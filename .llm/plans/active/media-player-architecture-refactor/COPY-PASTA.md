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

- [ ] **Phase 3b — consumer migration; delete superseded helpers**

  *Status (housekeeping audit): not started — `useMediaPlayerResourceUpdate` still exposes the legacy inline parameter object; callers pass `mediaPlayerResourceUpdate({ channel, clip, … })` rather than a single `PlaybackLoadRequest`. See [`03b-consumer-migration.md`](./03b-consumer-migration.md).*

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

- [ ] **Phase 4a — bridge API + controls context + element contract**

  Execute
  [`04a-bridge-api-and-element-architecture.md`](./04a-bridge-api-and-element-architecture.md):
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

- [ ] **Phase 4b — unified `<MediaElement>` for regular audio + video**

  Execute
  [`04b-unified-media-element-regular-av.md`](./04b-unified-media-element-regular-av.md):
  fully implement `<MediaElement>` for non-live targets; keep
  `LegacyLiveStreamControllerSelector` for livestreams; delete the
  legacy non-live audio/video controller files as listed. Verify:

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [ ] **Phase 4c — UI consumer migration; remove `MEDIA_PLAYER` event group**

  Execute
  [`04c-consumer-migration-and-bus-removal.md`](./04c-consumer-migration-and-bus-removal.md):
  migrate all `EVENTS.MEDIA_PLAYER` producers and listeners to
  `useMediaPlayerControls()` in the commit order documented there;
  delete the `MEDIA_PLAYER` group from `events.ts`. Verify:

  ```bash
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [ ] **Phase 5 — controller slim-down + ESLint guards**

  Execute [`05-controller-slim-down.md`](./05-controller-slim-down.md):
  ref cleanup, controller coordinator target (<250 lines), dead-code
  sweep, **`no-restricted-syntax` only** for `mediaRef` writes outside
  the bridge (no `video.js` import ban). Verify:

  ```bash
  wc -l \
    apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx \
    apps/web/src/components/MediaPlayer/MediaElement/MediaElement.tsx \
    apps/web/src/hooks/useMediaElementBridge.ts
  npm run lint -w apps/web
  npm run test:unit
  make e2e_test_web_report
  ```

- [ ] **Phase 6 — skill docs and merge**

  Execute [`06-skill-docs-and-merge.md`](./06-skill-docs-and-merge.md):
  write `.cursor/skills/media-player-architecture/SKILL.md`; verify
  the bridge ESLint guard; update `apps/web/AGENTS.md`; run final QA
  matrix; rebase; open PR; merge.

- [ ] **Plan archival (this plan-set)**

  **Run only after** the PR that merges `refactor/media-player` into
  `develop` has landed (so `develop` contains the shipped refactor).
  Then, per Plan Lifecycle:

  ```bash
  mv .llm/plans/active/media-player-architecture-refactor \
     .llm/plans/completed/media-player-architecture-refactor
  ```

- [ ] **Next initiative — livestream / HLS (separate plan-set)**

  Do **not** archive until ready to execute. Expand and run
  [`../media-player-livestream-hls-migration/`](../media-player-livestream-hls-migration/)
  when folding livestreams into `<MediaElement>` and retiring
  `video.js` is prioritized. That plan-set is placeholder-level until
  expanded.
