# Step 5 — Anonymous snapshot wiring

## Goal

Add the Playwright helper that writes an anonymous playback snapshot
to `localStorage` before navigation via `page.addInitScript`, and
lift the anonymous-restore spec out of `test.fixme()`. The helper
mirrors the production write shape so the spec asserts the matrix § 2
restore behavior end-to-end.

## Scope

- New file: `apps/web/e2e/helpers/anonymousSnapshot.ts`. A Playwright
  helper that calls `page.addInitScript` with a builder for the
  snapshot payload.
- Spec edit to lift
  [`media-player-anonymous-restore.spec.ts`](../../../apps/web/e2e/media-player-anonymous-restore.spec.ts)
  out of `test.fixme()`.
- **No DB inserts in this step.** Anonymous restore runs entirely
  through `localStorage` + already-seeded item / channel rows from
  steps 2 and 3.

## Deliverables

### 1. `apps/web/e2e/helpers/anonymousSnapshot.ts`

The helper must:

- Locate the production write shape by ripgrep:

  ```bash
  rg -n "anonymousPlaybackStorage|writeAnonymousPlaybackSnapshot|ANONYMOUS_PLAYBACK_SNAPSHOT" \
    apps/web/src
  ```

  Open the matching files (typically
  `apps/web/src/utils/anonymousPlaybackStorage.ts`) to capture the
  exact localStorage key and JSON shape (kind discriminator,
  `playback_position_seconds`, `media_file_duration_seconds`, item
  id_text, channel id_text, etc.).
- Export a typed function:

  ```typescript
  import type { Page } from '@playwright/test';

  export type AnonymousSnapshotKind =
    | 'item'        // podcast or video
    | 'item_music'
    | 'item_soundbite'
    | 'clip';

  export type WriteAnonymousSnapshotArgs = {
    kind: AnonymousSnapshotKind;
    itemIdText: string;
    channelIdText: string;
    playbackPositionSeconds: number;
    mediaFileDurationSeconds: number;
    // ...other fields the production writer requires
  };

  export async function writeAnonymousSnapshotBeforeNavigation(
    page: Page,
    args: WriteAnonymousSnapshotArgs,
  ): Promise<void> {
    await page.addInitScript((snapshotArgs) => {
      const STORAGE_KEY = 'ANONYMOUS_PLAYBACK_SNAPSHOT'; // mirror production key
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(/* build payload from snapshotArgs */),
      );
    }, args);
  }
  ```

  The exact `STORAGE_KEY` and payload field names **must** be sourced
  from the production code. If the production code re-exports the
  key as a named constant, prefer importing it directly into the
  helper rather than duplicating the literal.

- Provide a paired clearer:

  ```typescript
  export async function clearAnonymousSnapshotBeforeNavigation(
    page: Page,
  ): Promise<void> {
    await page.addInitScript(() => {
      window.localStorage.removeItem('ANONYMOUS_PLAYBACK_SNAPSHOT');
    });
  }
  ```

  Useful for the post-login branch of the spec to prove
  `clearAnonymousPlaybackSnapshot()` ran.

- Live under `apps/web/e2e/helpers/` so the existing helper alphabetic
  layout convention holds (alongside `setPasswordInvite.ts`,
  `seedConstants.ts`).

### 2. Spec lift — `media-player-anonymous-restore.spec.ts`

Replace `test.fixme()` with three test branches (matrix § 2):

- **Podcast snapshot restore**: while logged out, write a snapshot
  pointing at `E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT` with
  `playback_position_seconds = 60` and
  `media_file_duration_seconds = E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS`.
  Navigate to the home page (or wherever
  `AnonymousPlaybackRestoreController` mounts). Assert the controller
  loads the item, `mpCurrentTime` reflects the snapshot position
  before metadata, and `mpIsPlaying === false` (restore never
  auto-plays per matrix § 2).
- **Music snapshot restore (always 0)** (matrix § 2 music row): write
  a snapshot pointing at `E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT` with
  `playback_position_seconds = 45`; assert seek to `0` because the
  music kind forces zero on restore.
- **Login clears snapshot**: write a snapshot, then log in as the
  existing E2E user; assert the snapshot is cleared from
  `localStorage` and the restore controller does not run (matrix § 2
  "logged in" row).

The known clip-snapshot inconsistency from matrix § 2 ("when the
snapshot is a `clip`, the controller seeks to the **clip start**…") is
**documented** by the existing matrix note. The spec does not need to
assert that case to satisfy this plan-set; if a future Phase 2 change
modifies the behavior, the matrix note is the source of truth and the
spec gets a new branch then.

### 3. Constants imported via seedConstants helper

Spec imports the item id_text constants and the duration constants
from `apps/web/e2e/helpers/seedConstants.ts`. The helper itself is
agnostic of any specific id.

## Out of scope

- DB seed work (steps 2-4 supply all needed rows; this step only
  layers Playwright + `localStorage` on top).
- Asserting the snapshot writer in the **forward** direction
  (`writeAnonymousPlaybackSnapshotFromPlayerState` running on
  `updateNowPlaying` while logged out). That is covered by the
  Phase 1 orchestration tests for the writer side; the page-level
  spec only verifies the reader/restore side.
- Adding a snapshot-clip test branch (see matrix § 2 inconsistency
  note above).

## Exit criteria

- `apps/web/e2e/helpers/anonymousSnapshot.ts` exists, exports
  `writeAnonymousSnapshotBeforeNavigation` and
  `clearAnonymousSnapshotBeforeNavigation`, and uses the production
  localStorage key and payload shape.
- `make e2e_test_web_report_spec
  SPEC=e2e/media-player-anonymous-restore.spec.ts` passes all three
  test branches.
- The previously fixme'd spec no longer contains `test.fixme()` in
  source.
- The other five `media-player-*.spec.ts` specs and the seven Phase 1
  active specs remain green.

## Verification commands

```bash
make test_deps
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/media-player-anonymous-restore.spec.ts
```
