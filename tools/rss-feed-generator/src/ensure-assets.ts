/**
 * Ensures media assets (JPEG, MP3, MP4) exist under tools/test-assets/assets/rss-generator/
 * for use by generated RSS feeds. Never creates more than 100 of each type; skips existing files.
 *
 * Usage: npm run ensure-assets [-- --max N]
 *   --max N   Ensure up to N of each type (default 100, max 100). Use e.g. --max 10 for quick tests.
 */

import { AssetGenerator } from 'podverse-test-assets';

const NAMESPACE = 'rss-generator';
const MAX_CAP = 100;
const DEFAULT_MAX = 100;

function parseMaxArg(): number {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--max');
  const value = args[idx + 1];
  if (idx === -1 || value === undefined) return DEFAULT_MAX;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_MAX;
  return Math.min(n, MAX_CAP);
}

async function main(): Promise<void> {
  const max = parseMaxArg();
  console.log(`Ensuring up to ${max} image/audio/video assets (namespace: ${NAMESPACE})...\n`);

  const generator = new AssetGenerator({ namespace: NAMESPACE });
  await generator.ensureAssetsDirectory();

  for (let i = 1; i <= max; i++) {
    const pad = i.toString().padStart(3, '0');
    await generator.generateImage(`image-${pad}.jpg`);
    await generator.generateMP3(`audio-${pad}.mp3`, 1);
    await generator.generateMP4(`video-${pad}.mp4`, 1);
  }

  console.log(`\nDone. Assets are in tools/test-assets/assets/${NAMESPACE}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
