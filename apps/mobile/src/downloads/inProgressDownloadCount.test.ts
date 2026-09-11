import { describe, expect, it } from 'vitest';

import type { DownloadStatus } from './downloadTypes';
import {
  countInProgressDownloads,
  isInProgressDownloadStatus,
  sumBadgeCounts,
} from './inProgressDownloadCount';

const row = (status: DownloadStatus): { status: DownloadStatus } => ({ status });

describe('inProgressDownloadCount', () => {
  it('counts queued and downloading jobs only', () => {
    expect(
      countInProgressDownloads([
        row('queued'),
        row('downloading'),
        row('complete'),
        row('failed'),
        row('cancelled'),
      ])
    ).toBe(2);
  });

  it('treats a failed job as out of the count until it is queued again', () => {
    expect(isInProgressDownloadStatus('failed')).toBe(false);
    expect(countInProgressDownloads([row('failed')])).toBe(0);
    expect(countInProgressDownloads([row('queued')])).toBe(1);
  });

  it('sums row badges for a tab, ignoring zeros and negatives', () => {
    expect(sumBadgeCounts([3])).toBe(3);
    expect(sumBadgeCounts([2, 0, 4])).toBe(6);
    expect(sumBadgeCounts([-1, 2])).toBe(2);
  });
});
