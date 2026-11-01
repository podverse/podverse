import { describe, expect, it } from 'vitest';

import { formatDownloadByteProgress } from './formatDownloadByteProgress';

describe('formatDownloadByteProgress', () => {
  it('returns null when nothing has been written and the total is unknown', () => {
    expect(formatDownloadByteProgress(0, null)).toBeNull();
  });

  it('returns only written bytes when the total is unknown', () => {
    expect(formatDownloadByteProgress(1_572_864, null)).toBe('1.5 MB');
  });

  it('returns written and total when both are known', () => {
    expect(formatDownloadByteProgress(1_572_864, 47_185_920)).toBe('1.5 MB / 45 MB');
  });

  it('shows 0 B against a known total before any bytes land', () => {
    expect(formatDownloadByteProgress(0, 47_185_920)).toBe('0 B / 45 MB');
  });

  it('ignores a non-positive total and formats written bytes alone', () => {
    expect(formatDownloadByteProgress(512, 0)).toBe('512 B');
    expect(formatDownloadByteProgress(512, -1)).toBe('512 B');
  });
});
