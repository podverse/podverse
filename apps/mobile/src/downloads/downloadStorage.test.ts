import { describe, expect, it } from 'vitest';

import {
  buildDownloadFileName,
  buildDownloadFilePath,
  DOWNLOADS_SUBDIRECTORY,
  hashEnclosureUri,
  resolveStoredDownloadFilePath,
  toStoredDownloadFileName,
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

describe('toStoredDownloadFileName', () => {
  it('keeps a bare file name', () => {
    expect(toStoredDownloadFileName('itemABC.mp3')).toBe('itemABC.mp3');
  });

  it('strips an absolute file URI down to the file name', () => {
    expect(
      toStoredDownloadFileName(
        'file:///var/mobile/Containers/Data/Application/UUID/Documents/downloads/itemABC.mp3'
      )
    ).toBe('itemABC.mp3');
  });
});

describe('resolveStoredDownloadFilePath', () => {
  it('joins a relative file name to the current document directory', () => {
    expect(resolveStoredDownloadFilePath('itemABC.mp3', 'file:///docs/')).toBe(
      `file:///docs/${DOWNLOADS_SUBDIRECTORY}/itemABC.mp3`
    );
  });

  it('joins downloads/itemABC.mp3 and itemABC.mp3 to the same path', () => {
    expect(resolveStoredDownloadFilePath('downloads/itemABC.mp3', 'file:///docs/')).toBe(
      resolveStoredDownloadFilePath('itemABC.mp3', 'file:///docs/')
    );
  });

  it('returns a content:// URI trimmed, not joined under the document directory', () => {
    const uri =
      'content://com.android.externalstorage.documents/document/primary%3APodcasts%2FitemABC.mp3';
    expect(resolveStoredDownloadFilePath(`  ${uri}  `, 'file:///docs/')).toBe(uri);
  });
});
