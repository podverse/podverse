import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../config', () => ({
  getBrandSiteOrigin: () => 'https://podverse.example',
}));

import { buildEmbedMainSiteUrl, embedPathnameToMainSitePath } from '../buildEmbedMainSiteUrl';

describe('embedPathnameToMainSitePath', () => {
  it('maps typed embed routes to main-site paths', () => {
    expect(embedPathnameToMainSitePath('/embed/episode/e2e-episode')).toBe('/episode/e2e-episode');
    expect(embedPathnameToMainSitePath('/embed/track/e2e-track')).toBe('/track/e2e-track');
    expect(embedPathnameToMainSitePath('/embed/clip/e2e-clip')).toBe('/clip/e2e-clip');
    expect(embedPathnameToMainSitePath('/embed/chapter/e2e-chapter')).toBe('/chapter/e2e-chapter');
    expect(embedPathnameToMainSitePath('/embed/official-clip/e2e-soundbite')).toBe(
      '/official-clip/e2e-soundbite'
    );
    expect(embedPathnameToMainSitePath('/embed/podcast/e2e-podcast')).toBe('/podcast/e2e-podcast');
    expect(embedPathnameToMainSitePath('/embed/album/e2e-album')).toBe('/album/e2e-album');
    expect(embedPathnameToMainSitePath('/embed/playlist/e2e-playlist')).toBe(
      '/playlist/e2e-playlist'
    );
  });

  it('returns null for non-embed and demo index paths', () => {
    expect(embedPathnameToMainSitePath('/embed')).toBeNull();
    expect(embedPathnameToMainSitePath('/podcast/channel')).toBeNull();
    expect(embedPathnameToMainSitePath('/embed/unknown/id')).toBeNull();
  });
});

describe('buildEmbedMainSiteUrl', () => {
  it('builds an absolute URL on the brand site origin', () => {
    expect(buildEmbedMainSiteUrl('/embed/episode/e2e-episode')).toBe(
      'https://podverse.example/episode/e2e-episode'
    );
    expect(buildEmbedMainSiteUrl('/embed/podcast/e2e-podcast')).toBe(
      'https://podverse.example/podcast/e2e-podcast'
    );
  });
});
