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

    expect(metadata).toMatchObject({
      title: 'Podcasts',
      description: 'Browse podcast episodes, channels, and creators.',
      alternates: {
        canonical: 'https://podverse.example/podcasts',
      },
      openGraph: {
        type: 'website',
        url: 'https://podverse.example/podcasts',
        images: [{ url: 'https://img.example/podcasts.png' }],
      },
      twitter: {
        card: 'summary_large_image',
        images: ['https://img.example/podcasts.png'],
      },
    });
  });
});
