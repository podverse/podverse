import { describe, expect, it } from 'vitest';

import { normalizePathForMetricLabel } from './normalizePathForMetricLabel.js';

describe('normalizePathForMetricLabel', () => {
  it('returns / for empty or root paths', () => {
    expect(normalizePathForMetricLabel('')).toBe('/');
    expect(normalizePathForMetricLabel('/')).toBe('/');
    expect(normalizePathForMetricLabel('   ')).toBe('/');
  });

  it('collapses numeric path segments to :id', () => {
    expect(normalizePathForMetricLabel('/podcasts/42/episodes')).toBe('/podcasts/:id/episodes');
  });

  it('collapses UUID path segments to :id', () => {
    expect(
      normalizePathForMetricLabel('/buckets/a1b2c3d4-e5f6-4789-a012-3456789abcde/messages')
    ).toBe('/buckets/:id/messages');
  });

  it('preserves static segments', () => {
    expect(normalizePathForMetricLabel('/api/v2/auth/login')).toBe('/api/v2/auth/login');
  });
});
