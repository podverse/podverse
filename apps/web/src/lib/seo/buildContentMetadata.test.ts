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

    expect(metadata).toMatchObject({
      title: 'E2E Podcast Seed Channel',
      description: 'A deterministic channel for regression checks.',
      alternates: {
        canonical: 'https://podverse.example/podcast/e2ePodChnl001',
      },
      openGraph: {
        title: 'E2E Podcast Seed Channel',
        description: 'A deterministic channel for regression checks.',
        type: 'article',
        url: 'https://podverse.example/podcast/e2ePodChnl001',
        images: [{ url: 'https://img.example/podcast.png' }],
      },
      twitter: {
        title: 'E2E Podcast Seed Channel',
        description: 'A deterministic channel for regression checks.',
        card: 'summary_large_image',
        images: ['https://img.example/podcast.png'],
      },
    });
  });
});
