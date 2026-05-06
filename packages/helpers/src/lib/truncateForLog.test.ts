import { describe, expect, it } from 'vitest';

import { truncateForLog } from './truncateForLog.js';

describe('truncateForLog', () => {
  it('returns null for null or blank after trim', () => {
    expect(truncateForLog(null, 10)).toBe(null);
    expect(truncateForLog('', 10)).toBe(null);
    expect(truncateForLog('   ', 10)).toBe(null);
  });

  it('returns the string unchanged when within maxChars', () => {
    expect(truncateForLog('image/png', 256)).toBe('image/png');
    expect(truncateForLog('  x  ', 3)).toBe('x');
  });

  it('truncates with ellipsis when longer than maxChars', () => {
    expect(truncateForLog('abcdefghij', 4)).toBe('abcd…');
    expect(truncateForLog('abcdefghij', 9)).toBe('abcdefghi…');
  });
});
