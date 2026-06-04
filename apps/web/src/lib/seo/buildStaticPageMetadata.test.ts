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

import { buildStaticPageMetadata } from './buildStaticPageMetadata';

describe('buildStaticPageMetadata', () => {
  it('builds curated static page metadata shape', () => {
    const metadata = buildStaticPageMetadata({
      title: 'Podcasts',
      descriptionPlain: 'Browse podcast episodes, channels, and creators.',
      pathname: '/podcasts',
      imageUrl: 'https://img.example/podcasts.png',
    });

    expect(metadata.title).toBe('Podcasts');
    expect(metadata.description).toBe('Browse podcast episodes, channels, and creators.');
    expect(metadata.alternates?.canonical).toBe('https://podverse.example/podcasts');

    expect(metadata.openGraph?.type).toBe('website');
    expect(metadata.openGraph?.url).toBe('https://podverse.example/podcasts');
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://img.example/podcasts.png' }]);

    expect(metadata.twitter?.card).toBe('summary_large_image');
    expect(metadata.twitter?.images).toEqual(['https://img.example/podcasts.png']);
  });
});
