import { describe, expect, it } from 'vitest';

import {
  buildShrinkImageKey,
  bytesMatchStoredChecksum,
  trustHeadUnchanged,
} from './changeDetection.js';

describe('trustHeadUnchanged', () => {
  it('trusts matching etag when both sides have etag', () => {
    expect(
      trustHeadUnchanged(
        { etag: '"abc"', lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT' },
        { etag: '"abc"', lastModified: 'Tue, 02 Jan 2024 00:00:00 GMT', contentLength: 100 }
      )
    ).toBe(true);
  });

  it('does not trust content-length when etag differs', () => {
    expect(
      trustHeadUnchanged(
        { etag: '"old"', lastModified: null, contentLength: 500 },
        { etag: '"new"', lastModified: null, contentLength: 500 }
      )
    ).toBe(false);
  });

  it('trusts last-modified when neither side has etag', () => {
    expect(
      trustHeadUnchanged(
        { etag: null, lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT' },
        { etag: null, lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT', contentLength: 10 }
      )
    ).toBe(true);
  });

  it('returns false when source is null', () => {
    expect(trustHeadUnchanged(null, { etag: '"x"', lastModified: null, contentLength: null })).toBe(
      false
    );
  });
});

describe('bytesMatchStoredChecksum', () => {
  const sha = (b: Uint8Array): string => {
    let s = '';
    for (let i = 0; i < b.length; i += 1) {
      s += String.fromCharCode(b[i] ?? 0);
    }
    return s;
  };

  it('matches when checksum equals digest of buffer', () => {
    const buf = new Uint8Array([1, 2, 3]);
    expect(bytesMatchStoredChecksum({ checksumSha256: sha(buf) }, buf, sha)).toBe(true);
  });

  it('returns false when stored checksum missing', () => {
    const buf = new Uint8Array([1]);
    expect(bytesMatchStoredChecksum(null, buf, sha)).toBe(false);
  });
});

describe('buildShrinkImageKey', () => {
  it('embeds url hash, width, and content checksum prefix', () => {
    const key = buildShrinkImageKey({
      entityType: 'item',
      entityId: 42,
      widthPx: 400,
      contentChecksumSha256Hex: 'abcdef0123456789',
      urlHash: 'urlhash',
    });
    expect(key).toBe('images/item/42/urlhash-w400-cabcdef0123456789.webp');
  });
});
