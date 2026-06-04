import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config', () => {
  return {
    getConfig: () => ({
      public: {
        brand: { name: 'Podverse' },
      },
    }),
    getWebOrigin: () => 'https://podverse.example',
  };
});

import { buildContentMetadata } from './buildContentMetadata';

describe('buildContentMetadata', () => {
  it('builds title, description, canonical, and social metadata', () => {
    const metadata = buildContentMetadata({
      title: 'E2E Podcast Seed Channel',
      descriptionPlain: 'A deterministic channel for regression checks.',
      pathname: '/podcast/e2ePodChnl001',
      imageUrl: 'https://img.example/podcast.png',
    });

    expect(metadata.title).toBe('E2E Podcast Seed Channel');
    expect(metadata.description).toBe('A deterministic channel for regression checks.');
    expect(metadata.alternates?.canonical).toBe('https://podverse.example/podcast/e2ePodChnl001');

    expect(metadata.openGraph?.title).toBe('E2E Podcast Seed Channel');
    expect(metadata.openGraph?.description).toBe('A deterministic channel for regression checks.');
    expect(metadata.openGraph?.type).toBe('article');
    expect(metadata.openGraph?.url).toBe('https://podverse.example/podcast/e2ePodChnl001');
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://img.example/podcast.png' }]);

    expect(metadata.twitter?.title).toBe('E2E Podcast Seed Channel');
    expect(metadata.twitter?.description).toBe('A deterministic channel for regression checks.');
    expect(metadata.twitter?.card).toBe('summary_large_image');
    expect(metadata.twitter?.images).toEqual(['https://img.example/podcast.png']);
  });
});
