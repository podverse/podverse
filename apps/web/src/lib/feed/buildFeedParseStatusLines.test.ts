import { describe, expect, it } from 'vitest';

import {
  buildFeedParseStatusLines,
  type FeedParseStatusLabels,
} from './buildFeedParseStatusLines';

const labels: FeedParseStatusLabels = {
  lastParsed: (date) => `Last Parsed: ${date}`,
  lastFailedParse: (date) => `Last failed parse: ${date}`,
  neverFullyParsed: 'Never fully parsed',
};

const formatDate = (iso: string) => `formatted:${iso}`;

describe('buildFeedParseStatusLines', () => {
  it('returns success line only when only last_finished_parse_time is set', () => {
    const { lines } = buildFeedParseStatusLines(
      {
        lastFinishedParseTime: '2024-01-01T12:00:00.000Z',
        lastFailedParseTime: null,
      },
      formatDate,
      labels
    );

    expect(lines).toEqual(['Last Parsed: formatted:2024-01-01T12:00:00.000Z']);
  });

  it('returns success and failure lines when failure is newer than success', () => {
    const { lines } = buildFeedParseStatusLines(
      {
        lastFinishedParseTime: '2024-01-01T12:00:00.000Z',
        lastFailedParseTime: '2024-01-02T12:00:00.000Z',
      },
      formatDate,
      labels
    );

    expect(lines).toEqual([
      'Last Parsed: formatted:2024-01-01T12:00:00.000Z',
      'Last failed parse: formatted:2024-01-02T12:00:00.000Z',
    ]);
  });

  it('returns failure and never-fully-parsed fallback when success is absent', () => {
    const { lines } = buildFeedParseStatusLines(
      {
        lastFinishedParseTime: null,
        lastFailedParseTime: '2024-01-02T12:00:00.000Z',
      },
      formatDate,
      labels
    );

    expect(lines).toEqual(['Last failed parse: formatted:2024-01-02T12:00:00.000Z']);
  });

  it('returns success only when failure is older than success', () => {
    const { lines } = buildFeedParseStatusLines(
      {
        lastFinishedParseTime: '2024-01-02T12:00:00.000Z',
        lastFailedParseTime: '2024-01-01T12:00:00.000Z',
      },
      formatDate,
      labels
    );

    expect(lines).toEqual(['Last Parsed: formatted:2024-01-02T12:00:00.000Z']);
  });

  it('returns never fully parsed when both timestamps are absent', () => {
    const { lines } = buildFeedParseStatusLines(
      {
        lastFinishedParseTime: null,
        lastFailedParseTime: null,
      },
      formatDate,
      labels
    );

    expect(lines).toEqual(['Never fully parsed']);
  });
});
