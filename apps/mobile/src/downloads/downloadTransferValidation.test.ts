import { describe, expect, it } from 'vitest';

import type { DownloadTransferSnapshot } from './downloadTransferValidation';
import { contentTypeHeaderValue, validateDownloadTransfer } from './downloadTransferValidation';

const invalid = { errorReason: 'invalid_response', ok: false } as const;

describe('validateDownloadTransfer', () => {
  it('accepts a non-empty 2xx payload, including a missing or unrecognized content type', () => {
    const accepted: DownloadTransferSnapshot[] = [
      { byteSize: 1024, contentTypes: ['audio/mpeg'], status: 200 },
      { byteSize: 8, contentTypes: ['video/mp4'], status: 206 },
      { byteSize: 8, contentTypes: [null, undefined], status: 200 },
      { byteSize: 8, contentTypes: ['application/octet-stream'], status: 299 },
    ];
    for (const snapshot of accepted) {
      expect(validateDownloadTransfer(snapshot)).toEqual({ ok: true });
    }
  });

  it('rejects non-2xx responses, empty files, and explicit non-media content types', () => {
    const rejected: DownloadTransferSnapshot[] = [
      { byteSize: 40, contentTypes: ['audio/mpeg'], status: 404 },
      { byteSize: 40, contentTypes: ['audio/mpeg'], status: 199 },
      { byteSize: 40, contentTypes: ['audio/mpeg'], status: 300 },
      { byteSize: 40, contentTypes: ['audio/mpeg'], status: null },
      { byteSize: 0, contentTypes: ['audio/mpeg'], status: 200 },
      { byteSize: 40, contentTypes: ['text/html'], status: 200 },
      { byteSize: 40, contentTypes: ['text/html; charset=utf-8'], status: 200 },
      { byteSize: 40, contentTypes: ['application/json'], status: 200 },
      { byteSize: 40, contentTypes: ['TEXT/PLAIN'], status: 200 },
      {
        byteSize: 40,
        contentTypes: ['audio/mpeg', 'application/json;charset=utf-8'],
        status: 200,
      },
    ];
    for (const snapshot of rejected) {
      expect(validateDownloadTransfer(snapshot)).toEqual(invalid);
    }
  });
});

describe('contentTypeHeaderValue', () => {
  it('reads Content-Type regardless of header case and ignores a missing header', () => {
    expect(contentTypeHeaderValue({ 'Content-Type': 'audio/mpeg' })).toBe('audio/mpeg');
    expect(contentTypeHeaderValue({ 'content-type': 'video/mp4' })).toBe('video/mp4');
    expect(contentTypeHeaderValue({ 'Content-Type': '   ' })).toBeNull();
    expect(contentTypeHeaderValue({})).toBeNull();
    expect(contentTypeHeaderValue(null)).toBeNull();
  });
});
