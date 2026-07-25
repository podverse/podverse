import { describe, expect, it } from 'vitest';

import {
  buildDownloadFileName,
  buildDownloadFilePath,
  DOWNLOADS_SUBDIRECTORY,
  hashEnclosureUri,
} from './downloadStorage';

describe('hashEnclosureUri', () => {
  it('is deterministic and 8 hex chars', () => {
    const a = hashEnclosureUri('https://x/ep.mp3');
    const b = hashEnclosureUri('https://x/ep.mp3');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('differs for different URIs', () => {
    expect(hashEnclosureUri('https://x/ep1.mp3')).not.toBe(hashEnclosureUri('https://x/ep2.mp3'));
  });
});

describe('buildDownloadFileName', () => {
  it('keeps the progressive extension', () => {
    expect(buildDownloadFileName('itemABC', 'mp3')).toBe('itemABC.mp3');
    expect(buildDownloadFileName('itemABC', 'm4a')).toBe('itemABC.m4a');
  });

  it('omits the extension when unknown', () => {
    expect(buildDownloadFileName('itemABC', null)).toBe('itemABC');
  });

  it('sanitizes unsafe id_text characters', () => {
    expect(buildDownloadFileName('a/b:c d', 'mp3')).toBe('a_b_c_d.mp3');
  });
});

describe('buildDownloadFilePath', () => {
  it('joins base directory, subdirectory, and filename', () => {
    expect(buildDownloadFilePath('file:///docs/', 'itemABC.mp3')).toBe(
      `file:///docs/${DOWNLOADS_SUBDIRECTORY}/itemABC.mp3`
    );
  });

  it('normalizes a missing trailing slash on the base directory', () => {
    expect(buildDownloadFilePath('file:///docs', 'itemABC.mp3')).toBe(
      `file:///docs/${DOWNLOADS_SUBDIRECTORY}/itemABC.mp3`
    );
  });
});
