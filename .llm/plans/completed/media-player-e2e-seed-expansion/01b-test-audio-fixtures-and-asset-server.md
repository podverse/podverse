# Step 1b — Test audio fixtures and asset-server wiring

## Goal

Provide a fully self-contained, deterministic source of real media bytes
for every non-livestream `media-player-*` E2E spec. No third-party hosts,
no network requests outside `localhost`. The `<audio>` element on
podcast / music / add-by-RSS pages actually plays through to
`loadedmetadata`, `timeupdate`, and `ended` events, so the matrix-cell
assertions in steps 2-4 are real instead of hand-waved.

This step is a pre-flight for the DB-seed inserts in steps 2-4. It does
not insert any rows itself; it lands the fixtures and the
Playwright/asset-server wiring those rows depend on.

## Scope

In scope:

- New generator script that emits six deterministic MP3 fixtures via the
  existing [`tools/test-assets/src/asset-generator.ts`](../../../tools/test-assets/src/asset-generator.ts)
  `AssetGenerator` class.
- Committed fixture files under
  `tools/test-assets/assets/e2e/audio/` (small total, ~150-250 KB).
- Targeted gitignore exception in
  [`tools/test-assets/.gitignore`](../../../tools/test-assets/.gitignore)
  so the `e2e/` subtree escapes the existing `assets/**/*.mp3` ignore.
- New Playwright `webServer` entry in
  [`apps/web/playwright.e2e-webservers.ts`](../../../apps/web/playwright.e2e-webservers.ts)
  that auto-starts `podverse-test-assets` on port 2111 alongside the
  existing api / sidecar / web servers.
- Constant additions to step 1's `seedConstants.ts` and the seed mirror
  block, mapping fixture filenames to `enclosure_url` values used by
  steps 2-4.

Out of scope:

- DB inserts (owned by steps 2-4).
- Spec lifts (owned by steps 2-4 and 5).
- Any change under `apps/web/src/**`.
- Livestream specs (owned by
  [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)).
- Replacing the existing reference to `http://localhost:2111/audio/audio-001.mp3`
  inside [`apps/web/src/app/e2e/media-player-foundation/page.tsx`](../../../apps/web/src/app/e2e/media-player-foundation/page.tsx)
  — that pre-existing reference simply starts working for free once
  Playwright auto-starts the server.

## Fixture inventory

Six sine-wave MP3 fixtures. Each is deterministic given fixed
`(filename, duration, frequencyHz, bitrateKbps, channels, sampleRateHz)`.
All fixtures use **24 kbps mono @ 22050 Hz** to keep the committed
binaries small (~150 KB per minute). A sine tone has negligible
spectral content above ~1 kHz, so the low fidelity is more than enough
for matrix-cell assertions. Frequencies stay between `AUDIO_FREQ_MIN`
(220) and `AUDIO_FREQ_MAX` (440) per
[`asset-generator.ts`](../../../tools/test-assets/src/asset-generator.ts).

| Filename | Duration (s) | Frequency (Hz) | Spec consumer |
| --- | --- | --- | --- |
| `e2e-podcast-short-60s-440hz.mp3` | 60 | 440 | clip / soundbite end-pause, chapter seek |
| `e2e-podcast-resume-60s-440hz.mp3` | 60 | 440 | podcast resume (3 branches, against abridged d=60) |
| `e2e-music-track-one-30s-330hz.mp3` | 30 | 330 | music spec (track one) |
| `e2e-music-track-two-30s-294hz.mp3` | 30 | 294 | music spec (track two) |
| `e2e-addbyrss-with-position-60s-440hz.mp3` | 60 | 440 | add-by-RSS resume (with stored position) |
| `e2e-addbyrss-fresh-60s-440hz.mp3` | 60 | 440 | add-by-RSS resume (no stored position) |

Distinct music frequencies (330 vs 294 Hz) keep the two tracks byte-
distinct without changing duration. The add-by-RSS pair share frequency
because the spec distinguishes them by row, not by audio content.

Total on-disk footprint: ~900 KB across all six fixtures.

### Why durations shrank from the prior draft

An earlier draft used 1800 s for podcast resume and 300 s for add-by-RSS
to mirror "realistic" episode lengths. At 24 kbps mono that would be
~5.4 MB for the 1800 s file alone — too large for a comfortable commit.
The matrix-cell branches (`p > 0`, `p >= d - 5`, no-stored-position) are
fully expressible against a `d = 60` abridged row using `p = 5` and
`p = 57`. Step 1's `seedConstants.ts` reflects the new values:

- `E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS = 60` (was 1800)
- `E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5` (was 30)
- `E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS = 57` (was 1797; still `>= d - 5`)
- `E2E_MUSIC_TRACK_DURATION_SECONDS = 30` (was 180)
- `E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 25` (was 42; still inside the 60 s fixture)

## Deliverables

### 1. Generator script — `tools/test-assets/src/generate-e2e-media-fixtures.ts`

Idempotent one-off generator that reuses the namespaced
`AssetGenerator` and passes explicit bitrate / channel / sample-rate
options so the committed bytes are reproducible:

```typescript
import { AssetGenerator } from './asset-generator.js';

const generator = new AssetGenerator({ namespace: 'e2e' });

const COMMON_OPTIONS = {
  bitrateKbps: 24,
  channels: 1 as const,
  sampleRateHz: 22050,
};

async function main(): Promise<void> {
  await generator.ensureAssetsDirectory();
  await generator.generateMP3('e2e-podcast-short-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);
  await generator.generateMP3('e2e-podcast-resume-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);
  await generator.generateMP3('e2e-music-track-one-30s-330hz.mp3', 30, 330, COMMON_OPTIONS);
  await generator.generateMP3('e2e-music-track-two-30s-294hz.mp3', 30, 294, COMMON_OPTIONS);
  await generator.generateMP3('e2e-addbyrss-with-position-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);
  await generator.generateMP3('e2e-addbyrss-fresh-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);
}
```

The `options` parameter is a backward-compatible addition to
`AssetGenerator.generateMP3` (defaults: 128 kbps, stereo, no explicit
sample rate — matching the prior signature).

Add an npm script in
[`tools/test-assets/package.json`](../../../tools/test-assets/package.json):

```json
"generate:e2e-media": "tsx src/generate-e2e-media-fixtures.ts"
```

`generateMP3` is skip-if-exists, so the script is idempotent across
reruns.

### 2. Committed fixtures

Generate the six MP3s once and commit them under
`tools/test-assets/assets/e2e/audio/`. They become the source of truth
for byte-exact, network-free playback in CI and on every developer
machine.

### 3. Gitignore exception

In
[`tools/test-assets/.gitignore`](../../../tools/test-assets/.gitignore),
add an unignore block immediately after the existing
`assets/**/*` patterns:

```gitignore
# Commit the deterministic E2E fixtures (do not regenerate per CI run)
!assets/e2e/
!assets/e2e/**
```

The exception is scoped to the `e2e/` subdirectory; all other
generated assets remain gitignored.

### 4. Playwright webServer entry

Append a fourth entry to `buildE2eWebServers()` in
[`apps/web/playwright.e2e-webservers.ts`](../../../apps/web/playwright.e2e-webservers.ts):

```typescript
{
  command: 'npm run start -w podverse-test-assets',
  port: 2111,
  cwd: '../..',
  timeout: 30_000,
  reuseExistingServer: true,
},
```

`reuseExistingServer: true` matters: developers who run the asset
server manually (because they use the foundation harness or are
debugging) will not see Playwright kill and restart it. The asset
server is stateless and CORS-enabled, so reuse is safe.

### 5. Constants in `seedConstants.ts`

Step 1 of this plan-set (`01-seed-extension-design.md`) introduces the
`seedConstants.ts` file. This step adds these constants alongside the
existing id_text values:

```typescript
export const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';

export const E2E_PODCAST_SHORT_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
export const E2E_PODCAST_RESUME_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
export const E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
export const E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-addbyrss-with-position-60s-440hz.mp3`;
export const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-addbyrss-fresh-60s-440hz.mp3`;
```

A matching JS-side mirror block lands in
[`tools/web/seed-e2e.mjs`](../../../tools/web/seed-e2e.mjs) when step 1
is implemented (or in this step if step 1 has already shipped).

## Fast-forward pattern (used by steps 2-4 spec lifts)

Real `<audio>` events make assertions deterministic but waiting wall-
clock seconds for `timeupdate` or `ended` is slow. Specs use Playwright
to fast-forward the element directly:

```typescript
const audio = page.locator('audio').first();
await audio.evaluate((el: HTMLAudioElement) => {
  el.currentTime = 13;
});
// then await the controller-state transition via mediaPlayerAssertions helpers
```

The browser fires `timeupdate` immediately after the assignment, which
in turn triggers the controller's matrix § 6 side effects (clip end
pause, soundbite end pause, chapter sync). For the `ended` event, set
`currentTime = el.duration - 0.2` and the browser drives it home.

`loadedmetadata` does not need a fast-forward; it fires as soon as the
asset server delivers the file, which is essentially immediate for a
localhost fixture.

## Determinism guarantees

- Same fixture bytes on every checkout (committed binaries).
- Same media metadata (duration, codec, bitrate) on every load.
- Same network shape (zero external network; only `localhost:2111`).
- Same DB content (existing idempotent seed pattern, unchanged).
- `reuseExistingServer: true` + stateless server = order-independent
  Playwright runs.

## Out of scope

- DB inserts and spec lifts (steps 2-4 and 5).
- Anything under `apps/web/src/**`.
- Livestream specs (still `test.fixme()`; HLS migration plan-set
  scope).

## Exit criteria

- `tools/test-assets/assets/e2e/audio/` exists and contains the six
  MP3s. They are tracked by git.
- `npm run generate:e2e-media -w podverse-test-assets` is idempotent
  (rerunning is a no-op).
- `make e2e_test_web_report_spec SPEC=e2e/media-player-livestream-audio-start.spec.ts`
  auto-starts port 2111 (proving Playwright's webServer wiring) and
  the existing Phase 1 livestream spec still passes. Full regression
  is `make e2e_test_report`.
- No file under `apps/web/src/**` is modified.

## Verification commands

```bash
make test_deps
./scripts/nix/with-env npm run generate:e2e-media -w podverse-test-assets
make e2e_seed_web
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/media-player-livestream-audio-start.spec.ts
```

The `_report_spec` run lights up only the existing livestream spec
but exercises the full Playwright webServer pool, so it proves the
asset server boots cleanly without burning ~15 minutes on a full
regression. For pre-merge, run `make e2e_test_report` (full).
