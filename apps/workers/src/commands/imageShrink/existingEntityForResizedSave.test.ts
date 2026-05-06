import { describe, expect, it } from 'vitest';

import { existingEntityForResizedSave } from './existingEntityForResizedSave.js';

describe('existingEntityForResizedSave', () => {
  it('returns undefined when updating from RSS source row so caller inserts a new resized row', () => {
    const source = { url: 'https://feed.example.com/cover.jpg', is_resized: false };
    expect(existingEntityForResizedSave(source)).toBeUndefined();
  });

  it('returns the row when persisted row is resized and URL differs (rotation case)', () => {
    const previousResized = {
      url: 'https://cdn.example.com/images/channel/1/abc-w300-cOLD.webp',
      is_resized: true,
    };
    expect(existingEntityForResizedSave(previousResized)).toBe(previousResized);
  });

  it('returns the row when updating the same resized CDN URL in place', () => {
    const row = {
      url: 'https://cdn.example.com/images/channel/1/abc-w300-cdeadbeef.webp',
      is_resized: true,
    };
    expect(existingEntityForResizedSave(row)).toBe(row);
  });

  it('treats missing is_resized like source row (do not pass existing entity)', () => {
    const ambiguous = { url: 'https://example.com/x.jpg' };
    expect(existingEntityForResizedSave(ambiguous)).toBeUndefined();
  });
});
