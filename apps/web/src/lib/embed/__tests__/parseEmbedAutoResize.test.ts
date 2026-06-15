import { describe, expect, it } from 'vitest';

import { parseEmbedAutoResize } from '../parseEmbedAutoResize';

describe('parseEmbedAutoResize', () => {
  it('parses accepted truthy values', () => {
    expect(parseEmbedAutoResize('1')).toBe(true);
    expect(parseEmbedAutoResize('true')).toBe(true);
  });

  it('parses false for non-truthy values', () => {
    expect(parseEmbedAutoResize(undefined)).toBe(false);
    expect(parseEmbedAutoResize('0')).toBe(false);
    expect(parseEmbedAutoResize('no')).toBe(false);
  });
});
