import { describe, expect, it } from 'vitest';

import { insertBoostsChip } from './insertBoostsChip';

describe('insertBoostsChip', () => {
  it('leaves the row unchanged when Boosts is off', () => {
    const tabs = ['summary', 'funding', 'people'] as const;
    const result = insertBoostsChip(tabs, false, 'funding');
    expect(result).toEqual(['summary', 'funding', 'people']);
    expect(result).not.toContain('boosts');
  });

  it('inserts Boosts immediately before Funding', () => {
    expect(insertBoostsChip(['summary', 'funding', 'people'], true, 'funding')).toEqual([
      'summary',
      'boosts',
      'funding',
      'people',
    ]);
  });

  it('appends Boosts when the anchor chip is absent', () => {
    expect(insertBoostsChip(['summary', 'people'], true, 'funding')).toEqual([
      'summary',
      'people',
      'boosts',
    ]);
  });
});
