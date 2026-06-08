/**
 * Generate deterministic E2E image fixtures under
 * `tools/test-assets/assets/e2e/images/`.
 *
 * Run from repo root:
 *   npm run generate:e2e-images -w podverse-test-assets
 */

import { AssetGenerator } from './asset-generator.js';

const generator = new AssetGenerator({ namespace: 'e2e' });

async function main(): Promise<void> {
  await generator.ensureAssetsDirectory();
  await generator.generateImage(
    'e2e-embed-channel-art-1400.png',
    '#3366CC',
    { width: 1400, height: 1400 },
    'channel'
  );
  await generator.generateImage(
    'e2e-embed-item-art-1400.png',
    '#CC6633',
    { width: 1400, height: 1400 },
    'item'
  );
  await generator.generateImage(
    'e2e-embed-placeholder.png',
    '#666666',
    { width: 300, height: 300 },
    'placeholder'
  );
  console.log('E2E image fixtures ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
