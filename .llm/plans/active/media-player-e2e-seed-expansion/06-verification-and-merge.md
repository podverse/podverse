# Step 6 — Matrix cleanup, verification, and merge

## Goal

Close the plan-set: remove the now-stale "Non-livestream E2E
placeholders" subsection from the decision matrix, run the full web
E2E report to confirm no regressions, open a PR, merge, and archive.

## Scope

- Edit [`apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`](../../../apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
  to remove the "Non-livestream E2E placeholders" subsection and
  update the "Coverage" subsection's link list if needed.
- Full E2E web report run.
- PR open / merge of `feat/media-player-e2e-seeds → develop`.
- Archive the plan-set per
  [plan-completion](../../../.cursor/skills/plan-completion/SKILL.md).

## Deliverables

### 1. Matrix cleanup

Open the matrix doc and:

- Remove the entire **"Non-livestream E2E placeholders"** section
  (currently between "6c. Deferred to Phase 4" and "Cross-cutting
  side effects glossary"). That table is obsolete once all six specs
  are active.
- In the "Coverage" subsection at the bottom, **keep** the bullet
  point about E2E specs under `apps/web/e2e/` because the livestream
  fixme'd specs still exist; just update phrasing if it currently
  references the placeholders.
- Leave matrix § 6c "Deferred to Phase 4" **as-is**. The three
  livestream specs remain `test.fixme()` per the HLS migration
  plan-set's scope.

The matrix's behavior cells (§§ 1-6) are unchanged — they remain the
oracle the now-active specs assert against.

### 2. Full E2E web report

Run the full suite to confirm no regressions across all
`media-player-*.spec.ts` and the rest of the web E2E surface:

```bash
make e2e_test_web_report
```

Expected outcome:

- All six newly-active specs pass:
  - `media-player-clip-soundbite-end-pause`
  - `media-player-chapter-seek`
  - `media-player-podcast-resume`
  - `media-player-music-playback`
  - `media-player-anonymous-restore`
  - `media-player-addbyrss-resume`
- The seven Phase 1 active specs remain green:
  - `media-player-foundation`
  - `media-player-keyboard-shortcuts`
  - `media-player-space-shortcut`
  - `media-player-overlay-hierarchy`
  - `media-player-livestream-audio-start`
  - (plus any other `media-player-*` specs active on `develop`)
- The three livestream fixme'd specs are still skipped (not failed):
  - `media-player-livestream-video-start`
  - `media-player-livestream-to-podcast-transition`
  - `media-player-podcast-to-livestream-transition`
- Non-media-player E2E specs (auth, settings, etc.) remain green.

Visually scan a sample of step screenshots in `.artifacts/e2e-reports`
to confirm UI rendered correctly for the lifted specs.

### 3. Management-web sanity

```bash
make e2e_test_management_web_report
```

This plan-set does not touch management-web, but rebases pick up
other people's changes, so confirm the management-web report is also
clean before merging.

### 4. Lint and unit-test sanity

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
```

Should pass — this plan-set does not touch `apps/web/src/` except
inside `apps/web/e2e/`, but the linter does run over `e2e/helpers/`
and over `seedConstants.ts`.

### 5. PR + merge

Open a PR:

- Title: `feat(web/e2e): media-player seed expansion — lift six fixme specs`
- Description: link to this plan-set; list the six lifted specs;
  call out that the three livestream specs remain fixme'd and are
  owned by [media-player-livestream-hls-migration](../media-player-livestream-hls-migration/);
  link to the matrix cleanup commit.
- After CI is green and review approval, squash-merge into `develop`.

### 6. Archive the plan-set

After the merge lands, archive per
[plan-completion](../../../.cursor/skills/plan-completion/SKILL.md):

```bash
mv .llm/plans/active/media-player-e2e-seed-expansion \
   .llm/plans/completed/media-player-e2e-seed-expansion
```

If
[media-player-architecture-refactor/COPY-PASTA.md](../media-player-architecture-refactor/COPY-PASTA.md)
references the gate row pointing at the still-active path
(`../media-player-e2e-seed-expansion/`), update that link to point
at the new `../../completed/media-player-e2e-seed-expansion/`
location in the same archival commit.

### 7. Notify the architecture refactor gate

Once this plan-set is merged on `develop`, the
[media-player-architecture-refactor](../media-player-architecture-refactor/)
plan-set's `3b-gate` row is satisfied. Mark the gate checkbox in
[`COPY-PASTA.md`](../media-player-architecture-refactor/COPY-PASTA.md)
in the refactor's branch (whichever branch is the current target
for refactor work — typically `refactor/media-player`) so the next
developer working from that branch sees the gate is open.

## Out of scope

- Any production code change.
- Backporting matrix-cell updates that the new specs surface as
  bugs — those are tracked as separate issues, not on this branch.
- Touching the livestream specs or the HLS migration plan-set.

## Exit criteria

- The "Non-livestream E2E placeholders" subsection is removed from
  the matrix doc.
- `make e2e_test_web_report` passes with all six lifted specs active.
- `make e2e_test_management_web_report` is clean.
- `npm run lint -w apps/web` and `npm run test:unit -w apps/web` are
  clean.
- The PR is merged into `develop` and the plan-set directory is
  moved to `.llm/plans/completed/`.
- The architecture-refactor gate checkbox is marked open.

## Verification commands

```bash
make test_deps
make e2e_seed_web
make e2e_test_web_report
make e2e_test_management_web_report
npm run lint -w apps/web
npm run test:unit -w apps/web
```
