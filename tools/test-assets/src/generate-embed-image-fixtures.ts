/**
 * Generate deterministic embed demo image fixtures under
 * `apps/web/public/embed-demo/images/`.
 *
 * Run from repo root:
 *   npm run generate:embed-images -w podverse-test-assets
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { AssetGenerator } from './asset-generator.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const generator = new AssetGenerator({
  assetsDir: path.join(repoRoot, 'apps/web/public/embed-demo'),
});

const IMAGE_SIZE = { width: 1400, height: 1400 };

async function main(): Promise<void> {
  await generator.ensureAssetsDirectory();

  const fixtures: Array<{ filename: string; color: string; label: string }> = [
    {
      filename: 'embed-sample-podcast-channel-art.png',
      color: '#1D4E89',
      label: 'Podcast',
    },
    {
      filename: 'embed-sample-episode-audio-art.png',
      color: '#2E86AB',
      label: 'Episode audio',
    },
    {
      filename: 'embed-sample-episode-video-art.png',
      color: '#A23B72',
      label: 'Episode video',
    },
    {
      filename: 'embed-sample-album-channel-art.png',
      color: '#6B2D5C',
      label: 'Album',
    },
    {
      filename: 'embed-sample-track-audio-art.png',
      color: '#F18F01',
      label: 'Track audio',
    },
    {
      filename: 'embed-sample-track-video-art.png',
      color: '#C73E1D',
      label: 'Track video',
    },
    {
      filename: 'embed-sample-clip-art.png',
      color: '#E9C46A',
      label: 'Clip',
    },
    {
      filename: 'embed-sample-chapter-art.png',
      color: '#264653',
      label: 'Chapter',
    },
    {
      filename: 'embed-sample-chapter-intro-art.png',
      color: '#264653',
      label: 'Intro',
    },
    {
      filename: 'embed-sample-chapter-topic-a-art.png',
      color: '#2A9D8F',
      label: 'Topic A',
    },
    {
      filename: 'embed-sample-chapter-outro-art.png',
      color: '#E9C46A',
      label: 'Outro',
    },
    {
      filename: 'embed-sample-soundbite-art.png',
      color: '#E76F51',
      label: 'Official clip',
    },
    {
      filename: 'embed-sample-playlist-art.png',
      color: '#52B788',
      label: 'Playlist',
    },
    {
      filename: 'embed-sample-scroll-channel-art.png',
      color: '#7B6DD6',
      label: 'Scroll list',
    },
    {
      filename: 'embed-sample-private-channel-art.png',
      color: '#9E9E9E',
      label: 'Private',
    },
    {
      filename: 'embed-sample-placeholder.png',
      color: '#666666',
      label: 'Placeholder',
    },
  ];

  for (const fixture of fixtures) {
    await generator.generateImage(fixture.filename, fixture.color, IMAGE_SIZE, fixture.label);
  }

  console.log('Embed image fixtures ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
