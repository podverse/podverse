# Media-player E2E seed expansion — copy-pasta

Use one block at a time when executing this plan-set. Mark checkboxes
as you complete each step. Each numbered step is a logical commit (or
a small commit series) on `feat/media-player-e2e-seeds`; CI must stay
green at every commit.

- [x] **Step 0 — branch setup**

  Create the seed-expansion feature branch off latest `develop`:

  ```bash
  git fetch origin
  git switch develop
  git pull --ff-only
  git switch -c feat/media-player-e2e-seeds
  ```

- [x] **Step 1 — seed extension design + id constants**

  Execute
  [`01-seed-extension-design.md`](./01-seed-extension-design.md):
  create `apps/web/e2e/helpers/seedConstants.ts` with the
  deterministic id_text, seconds, and asset-server enclosure-URL
  constants; mirror those constants in `tools/web/seed-e2e.mjs` (no
  DB inserts yet); annotate the seed file to mark where steps 2-4
  will append. Verify:

  ```bash
  npm run lint -w apps/web
  make test_deps
  make e2e_seed_web
  make e2e_seed_web
  make e2e_test_report
  ```

- [x] **Step 1b — test audio fixtures + asset-server wiring**

  Execute
  [`01b-test-audio-fixtures-and-asset-server.md`](./01b-test-audio-fixtures-and-asset-server.md):
  add `tools/test-assets/src/generate-e2e-media-fixtures.ts`, commit
  the six deterministic MP3 fixtures under
  `tools/test-assets/assets/e2e/audio/`, add the gitignore exception,
  extend `AssetGenerator.generateMP3` with optional bitrate / channel /
  sample-rate options, and add the asset-server entry to
  `apps/web/playwright.e2e-webservers.ts`. No DB inserts and no spec
  lifts in this step. Verify:

  ```bash
  make test_deps
  npm run generate:e2e-media -w podverse-test-assets
  make e2e_seed_web
  make e2e_seed_web
  make e2e_test_web_report_spec SPEC=e2e/media-player-livestream-audio-start.spec.ts
  ```

  The `_report_spec` smoke confirms Playwright auto-starts the asset
  server alongside the other webServer entries. Run
  `make e2e_test_report` for the full pre-merge regression once you
  reach step 6.

- [x] **Step 2 — podcast item fixtures**

  Execute
  [`02-podcast-item-fixtures.md`](./02-podcast-item-fixtures.md):
  insert one podcast channel + four items (resume-positive,
  resume-near-end, resume-none, chaptered), plus clips, a soundbite,
  two chapters, and abridged playback rows. Lift these specs out of
  `test.fixme()`:
  - `media-player-clip-soundbite-end-pause.spec.ts`
  - `media-player-chapter-seek.spec.ts`
  - `media-player-podcast-resume.spec.ts`

  Verify:

  ```bash
  make test_deps
  make e2e_seed_web
  make e2e_seed_web
  make e2e_test_web_report_spec \
    SPEC=e2e/media-player-clip-soundbite-end-pause.spec.ts,e2e/media-player-chapter-seek.spec.ts,e2e/media-player-podcast-resume.spec.ts
  ```

- [x] **Step 3 — music album fixture**

  Execute
  [`03-music-album-fixture.md`](../../completed/media-player-e2e-seed-expansion/03-music-album-fixture.md):
  insert one music channel + two tracks + stored abridged row on
  track one + queue/auto-queue rows for the E2E user. Lift
  `media-player-music-playback.spec.ts` out of `test.fixme()`. Verify:

  ```bash
  make test_deps
  make e2e_seed_web
  make e2e_seed_web
  make e2e_test_web_report_spec SPEC=e2e/media-player-music-playback.spec.ts
  ```

- [x] **Step 4 — add-by-RSS fixture**

  Execute [`04-add-by-rss-fixture.md`](../../completed/media-player-e2e-seed-expansion/04-add-by-rss-fixture.md):
  insert two `add_by_rss_resource_data` rows (with-position, fresh)
  for the existing E2E user, after confirming
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is wired. Lift
  `media-player-addbyrss-resume.spec.ts` out of `test.fixme()`.
  Verify:

  ```bash
  make test_deps
  make e2e_seed_web
  make e2e_seed_web
  make e2e_test_web_report_spec SPEC=e2e/media-player-addbyrss-resume.spec.ts
  ```

- [x] **Step 5 — anonymous snapshot wiring**

  Execute [`05-anonymous-snapshot.md`](../../completed/media-player-e2e-seed-expansion/05-anonymous-snapshot.md):
  add `apps/web/e2e/helpers/anonymousSnapshot.ts`
  (`page.addInitScript` writer + clearer using the production
  localStorage key). Lift
  `media-player-anonymous-restore.spec.ts` out of `test.fixme()`.
  Verify:

  ```bash
  make test_deps
  make e2e_seed_web
  make e2e_test_web_report_spec SPEC=e2e/media-player-anonymous-restore.spec.ts
  ```

- [x] **Step 6 — matrix cleanup, verification, and merge**

  Execute
  [`06-verification-and-merge.md`](../../completed/media-player-e2e-seed-expansion/06-verification-and-merge.md):
  remove the "Non-livestream E2E placeholders" subsection from
  `MEDIA-PLAYER-DECISION-MATRIX.md`; run full E2E reports; open and
  merge the PR. Verify:

  ```bash
  make test_deps
  make e2e_seed_web
  make e2e_test_report
  npm run lint -w apps/web
  npm run test:unit
  ```

- [x] **Plan archival (this plan-set)**

  After merge, per Plan Lifecycle:

  ```bash
  mv .llm/plans/active/media-player-e2e-seed-expansion \
     .llm/plans/completed/media-player-e2e-seed-expansion
  ```

- [x] **Open the architecture-refactor gate**

  In
  [media-player-architecture-refactor/COPY-PASTA.md](../../active/media-player-architecture-refactor/COPY-PASTA.md),
  mark the `Gate — seed-expansion plan-set complete` checkbox so the
  next developer working on `refactor/media-player` sees Phase 3b is
  unblocked. If the architecture-refactor plan-set has since been
  archived, update the link in any stale references.
