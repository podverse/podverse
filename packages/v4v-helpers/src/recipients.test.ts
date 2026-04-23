import { describe, expect, it } from 'vitest';

import {
  calculateRecipientAmounts,
  normalizeRecipientSplits,
  sortRecipientsBySplitDescending,
} from './recipients.js';

describe('normalizeRecipientSplits', () => {
  it('returns zero normalized splits when total split is non-positive', () => {
    const recipients = [{ split: 0 }, { split: 0 }];
    expect(normalizeRecipientSplits(recipients)).toEqual([
      { split: 0, normalized_split: 0 },
      { split: 0, normalized_split: 0 },
    ]);
  });

  it('normalizes to integer percentages summing to 100', () => {
    const normalized = normalizeRecipientSplits([{ split: 1 }, { split: 1 }, { split: 1 }]);
    const sum = normalized.reduce((acc, r) => acc + r.normalized_split, 0);
    expect(sum).toBe(100);
    expect(normalized.map((r) => r.normalized_split)).toEqual([34, 33, 33]);
  });

  it('preserves minimum 1% for recipients with split >= 1 when reducing overflow', () => {
    const normalized = normalizeRecipientSplits([{ split: 100 }, { split: 1 }, { split: 1 }]);
    expect(normalized.map((r) => r.normalized_split)).toEqual([98, 1, 1]);
  });
});

describe('calculateRecipientAmounts', () => {
  it('calculates floored amounts from normalized splits', () => {
    const calculated = calculateRecipientAmounts([{ split: 1 }, { split: 1 }, { split: 1 }], 101);
    expect(calculated.map((r) => r.final_amount)).toEqual([34, 33, 33]);
  });
});

describe('sortRecipientsBySplitDescending', () => {
  it('sorts by normalized split descending and keeps equal-split order stable', () => {
    const recipients = [
      { id: 'a', normalized_split: 25 },
      { id: 'b', normalized_split: 50 },
      { id: 'c', normalized_split: 25 },
    ];
    const sorted = sortRecipientsBySplitDescending(recipients);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});
