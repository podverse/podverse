import { describe, expect, it } from 'vitest';

import {
  formatDirectoryChannelGoneDetail,
  isDirectoryChannelGoneError,
} from './directoryChannelGone';

const httpError = (status: number): { response: { status: number } } => {
  return { response: { status } };
};

describe('isDirectoryChannelGoneError', () => {
  it('treats an item-list 404 as a directory channel the device should drop', () => {
    expect(isDirectoryChannelGoneError(httpError(404))).toBe(true);
  });

  it('leaves other answers and transport failures to the retry path', () => {
    expect(isDirectoryChannelGoneError(httpError(403))).toBe(false);
    expect(isDirectoryChannelGoneError(httpError(500))).toBe(false);
    expect(isDirectoryChannelGoneError(new Error('network request failed'))).toBe(false);
  });
});

describe('formatDirectoryChannelGoneDetail', () => {
  it('names the channel so the error log can quote which follow was removed', () => {
    expect(formatDirectoryChannelGoneDetail('abc123', 'Podcasting 2.0')).toBe(
      'Podcasting 2.0 (abc123)'
    );
  });

  it('falls back to the id when the local row has no title', () => {
    expect(formatDirectoryChannelGoneDetail('abc123', '  ')).toBe('abc123');
    expect(formatDirectoryChannelGoneDetail('abc123', null)).toBe('abc123');
  });
});
