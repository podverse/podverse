/**
 * Generate deterministic E2E media fixtures under
 * `tools/test-assets/assets/e2e/audio/`.
 *
 * Output is byte-stable given fixed (filename, duration, frequency, bitrate,
 * channels, sample rate). `AssetGenerator.generateMP3` is skip-if-exists, so
 * reruns are idempotent.
 *
 * Run from repo root:
 *   npm run generate:e2e-media -w podverse-test-assets
 *
 * Fixtures are consumed by the seed inserts in
 * `.llm/plans/active/media-player-e2e-seed-expansion/` steps 2-4 and by the
 * matching spec lifts. See
 * `.llm/plans/active/media-player-e2e-seed-expansion/01b-test-audio-fixtures-and-asset-server.md`.
 *
 * Fixtures are intentionally low-fidelity (24 kbps mono @ 22050 Hz) to keep
 * the committed binaries small. A sine tone has negligible spectral content
 * above ~1 kHz so this is more than enough headroom for the test fixtures.
 */

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
  console.log('E2E media fixtures ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
