import { describe, expect, it } from 'vitest';

import { shouldAttemptMetaBoostStandardPost } from './metaBoostStandardPostAttempt.js';

describe('shouldAttemptMetaBoostStandardPost', () => {
  it('mirrors HTTP messaging capability only (no client-side amount gate)', () => {
    expect(shouldAttemptMetaBoostStandardPost(true)).toBe(true);
    expect(shouldAttemptMetaBoostStandardPost(false)).toBe(false);
  });
});
