/**
 * Generate deterministic embed demo audio fixtures under
 * `tools/test-assets/assets/embed/audio/`.
 *
 * Run from repo root:
 *   npm run generate:embed-media -w podverse-test-assets
 */

import { AssetGenerator } from './asset-generator.js';

const generator = new AssetGenerator({ namespace: 'embed' });

const COMMON_OPTIONS = {
  bitrateKbps: 24,
  channels: 1 as const,
  sampleRateHz: 22050,
};

async function main(): Promise<void> {
  await generator.ensureAssetsDirectory();

  await generator.generateMP3('embed-sample-episode-audio-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);
  await generator.generateMP3('embed-sample-track-audio-30s-330hz.mp3', 30, 330, COMMON_OPTIONS);
  await generator.generateMP3('embed-sample-track-two-30s-294hz.mp3', 30, 294, COMMON_OPTIONS);
  await generator.generateMP3('embed-sample-podcast-item-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);
  await generator.generateMP3('embed-sample-scroll-item-60s-440hz.mp3', 60, 440, COMMON_OPTIONS);

  console.log('Embed media fixtures ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
