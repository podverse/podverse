# Media-player E2E seed expansion — summary

## Scope

Test-infrastructure-only plan-set that lifts the six non-livestream
`test.fixme()` specs added during Phase 1 of the
[media-player-architecture-refactor](../media-player-architecture-refactor/)
into active page-level oracles. Each fixme is documented in
[`MEDIA-PLAYER-DECISION-MATRIX.md`](../../../apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
under "Non-livestream E2E placeholders" with its exact missing seed
requirement; this plan-set adds those seeds and removes the placeholders.

In scope:

- [`tools/web/seed-e2e.mjs`](../../../tools/web/seed-e2e.mjs) extensions —
  new deterministic podcast items, clips, soundbites, chapters, abridged
  playback rows, music album/tracks, add-by-RSS resource rows.
- [`apps/web/e2e/helpers/`](../../../apps/web/e2e/helpers/) additions —
  new `seedConstants.ts` (deterministic id_text values) and
  `anonymousSnapshot.ts` (localStorage write helper for
  `page.addInitScript`).
- The six specs themselves (each currently `test.fixme()`):
  - [`media-player-clip-soundbite-end-pause.spec.ts`](../../../apps/web/e2e/media-player-clip-soundbite-end-pause.spec.ts)
  - [`media-player-chapter-seek.spec.ts`](../../../apps/web/e2e/media-player-chapter-seek.spec.ts)
  - [`media-player-podcast-resume.spec.ts`](../../../apps/web/e2e/media-player-podcast-resume.spec.ts)
  - [`media-player-music-playback.spec.ts`](../../../apps/web/e2e/media-player-music-playback.spec.ts)
  - [`media-player-anonymous-restore.spec.ts`](../../../apps/web/e2e/media-player-anonymous-restore.spec.ts)
  - [`media-player-addbyrss-resume.spec.ts`](../../../apps/web/e2e/media-player-addbyrss-resume.spec.ts)
- Matrix cleanup in
  [`MEDIA-PLAYER-DECISION-MATRIX.md`](../../../apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md):
  remove the "Non-livestream E2E placeholders" subsection on completion.

## Out of scope

- Livestream specs and their seed/HLS infrastructure decision. Those
  remain `test.fixme()` and belong to the existing
  [media-player-livestream-hls-migration](../media-player-livestream-hls-migration/)
  plan-set (matrix § 6c documents the deferral). The audio-start
  controller-mount spec stays active and is the only livestream oracle
  the architecture refactor needs.
- Any change under `apps/web/src/**`. This plan-set does not alter
  production code. If a spec uncovers a behavior bug, file it as a
  separate issue rather than fixing it inline here.
- Changes to API or management-API code paths. The add-by-RSS path uses
  the existing `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` already wired for
  E2E; no new env vars or controllers.
- Authoring new orchestration or unit tests. Those landed in Phase 1 of
  the architecture refactor and remain the matrix-cell coverage layer.

## Dependency on the architecture refactor

None directionally — this plan-set is purely test infrastructure and
can land on a feature branch (`feat/media-player-e2e-seeds`) **before**
Phase 3b of the refactor. The refactor's Phase 3b is *gated* on this
plan-set merging (see refactor's `00-EXECUTION-ORDER.md` row `3b-gate`
and `COPY-PASTA.md` gate checkbox). The reverse dependency does not
exist; nothing in this plan-set imports from refactor branches.

## Behavior preservation contract

Each of the six specs asserts the cells already documented in
[`MEDIA-PLAYER-DECISION-MATRIX.md`](../../../apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md):

- Clip/soundbite end-pause: matrix § 6 (time-update side effects),
  rows for clip and soundbite + 1 buffer.
- Chapter seek: matrix § 1 (chapter row) + § 6 (chapter sync on
  `timeupdate`).
- Podcast resume: matrix § 1 (item-podcast row) including near-end
  clamp.
- Music playback: matrix § 1 (item-music — always 0) + § 4 (autoQueue
  transition).
- Anonymous restore: matrix § 2 (anonymous restore table) including
  the snapshot-clip seek inconsistency call-out.
- Add-by-RSS resume: matrix § 1 (add-by-RSS row) + § 6 (15s save
  cadence and play/pause save).

Specs assert observable behavior matching those cells. Any cell
mismatch surfaced by the spec must be either:

1. A bug — file it separately and keep the spec `test.fixme()` with an
   explicit reference to the bug, or
2. A documentation gap in the matrix — update the matrix on the same
   commit as activating the spec, and explain the divergence.

## Exit criteria

- All six specs run **without `test.fixme()`** under
  `make e2e_test_web_report` on `develop`.
- The "Non-livestream E2E placeholders" subsection in
  [`MEDIA-PLAYER-DECISION-MATRIX.md`](../../../apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
  is removed; surrounding "Coverage" references are updated.
- `make e2e_seed_web` (i.e. `tools/web/seed-e2e.mjs`) succeeds against a
  fresh `make test_deps` database with the new fixtures and is
  idempotent across reruns.
- No new flake — the same specs that were green in Phase 1 (keyboard
  shortcuts, space shortcut, overlay hierarchy, foundation, livestream
  header image, livestream audio start) stay green.
- The three livestream specs (`media-player-livestream-video-start`,
  `media-player-livestream-to-podcast-transition`,
  `media-player-podcast-to-livestream-transition`) remain
  `test.fixme()`; their pointer to matrix § 6c "Deferred to Phase 4"
  is unchanged.

## Branch model

- Single feature branch `feat/media-player-e2e-seeds` off `develop`.
- One commit per numbered plan file (1-6). CI must stay green at every
  commit.
- Rebase on `develop` weekly; the existing Phase 1 specs serve as the
  rebase smoke test.
- Merge via a normal squash PR; archive the plan-set on merge per
  [plan-completion](../../../.cursor/skills/plan-completion/SKILL.md).

## Rollback path

The plan-set's risk surface is contained because:

- No production code changes; nothing for end users to revert.
- Seed extensions are idempotent inserts; if a seed row breaks `make
  test_deps`, revert the seed change and the previous test data
  applies cleanly.
- Lifted specs depend on the seeds; if a spec flakes after lift, the
  cheap fix is to re-fixme it with the new failure mode captured in
  the matrix, then patch the seed/spec on a follow-up commit.

Two properties make rollback cheap:

- **Test-only blast radius.** Reverting any commit here does not
  touch shipped behavior; only CI coverage shifts.
- **No DB migration; no env var change; no infra change.** A revert
  needs no coordinated cleanup.

## Primary risks

- **Seed coupling to schema changes.** If `app_schema.sql` evolves
  during this plan-set's lifetime (e.g. abridged-row table rename),
  the seed needs to track it. Mitigation: each numbered file calls
  out the exact tables it inserts into so a schema change can locate
  affected seeds quickly.
- **Music queue/auto-queue determinism.** The music spec needs both a
  stable seed and stable in-app navigation to trigger track-ended and
  auto-queue transitions inside the page-test window. If the spec is
  too sensitive to timing, prefer asserting state via the controller's
  observable context fields rather than racing the media element.
- **Anonymous snapshot localStorage shape drift.** The snapshot helper
  must mirror `anonymousPlaybackStorage.ts`'s write format. If that
  format changes in a future refactor, the helper must change
  alongside it. The plan-set's `05-anonymous-snapshot.md` documents
  the contract.

## Follow-up plans

- [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
  picks up the three livestream `test.fixme()` specs as part of its
  own scope (it owns the HLS infrastructure decision: real server,
  mocked HLS via `page.route`, or extended seed). This seed-expansion
  plan-set explicitly **does not** address those.
