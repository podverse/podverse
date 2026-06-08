import { describe, expect, it } from 'vitest';

import { SEO_ROUTE_POLICIES } from './routeSeoPolicy';

const classFor = (pathPattern: string) =>
  SEO_ROUTE_POLICIES.find((entry) => entry.pathPattern === pathPattern)?.class;

describe('SEO_ROUTE_POLICIES', () => {
  it('maps major public RSS content routes to rss_public_content', () => {
    expect(classFor('/podcast/[channel_id]')).toBe('rss_public_content');
    expect(classFor('/episode/[item_id]')).toBe('rss_public_content');
    expect(classFor('/track/[item_id]')).toBe('rss_public_content');
  });

  it('maps major product/listing routes to product_listing', () => {
    expect(classFor('/')).toBe('product_listing');
    expect(classFor('/podcasts')).toBe('product_listing');
    expect(classFor('/episodes')).toBe('product_listing');
  });

  it('maps conditional public routes to conditional_public', () => {
    expect(classFor('/profile/[id_text]')).toBe('conditional_public');
    expect(classFor('/playlist/[playlist_id]')).toBe('conditional_public');
  });

  it('maps auth/utility routes to noindex', () => {
    expect(classFor('/search')).toBe('noindex');
    expect(classFor('/settings')).toBe('noindex');
    expect(classFor('/add-by-rss/**')).toBe('noindex');
    expect(classFor('/embed/**')).toBe('noindex');
  });
});
