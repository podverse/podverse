import { describe, expect, it } from 'vitest';

import { mapPlaybackErrorKind, normalizePlaybackError } from './playbackErrorTaxonomy';

describe('mapPlaybackErrorKind', () => {
  it('maps iOS custom codes', () => {
    expect(mapPlaybackErrorKind('invalid_url')).toBe('invalid-source');
    expect(mapPlaybackErrorKind('file_not_found')).toBe('file-not-found');
    expect(mapPlaybackErrorKind('audio_session')).toBe('audio-session');
    expect(mapPlaybackErrorKind('audio_session_activate')).toBe('audio-session');
  });

  it('maps Android Media3 network codes', () => {
    expect(mapPlaybackErrorKind('ERROR_CODE_IO_NETWORK_CONNECTION_FAILED')).toBe('network');
    expect(mapPlaybackErrorKind('ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT')).toBe('network');
    expect(mapPlaybackErrorKind('ERROR_CODE_IO_BAD_HTTP_STATUS')).toBe('network');
    expect(mapPlaybackErrorKind('ERROR_CODE_IO_CLEARTEXT_NOT_PERMITTED')).toBe('network');
  });

  it('maps Android Media3 file-not-found, decode, and unsupported codes', () => {
    expect(mapPlaybackErrorKind('ERROR_CODE_IO_FILE_NOT_FOUND')).toBe('file-not-found');
    expect(mapPlaybackErrorKind('ERROR_CODE_DECODING_FAILED')).toBe('decode');
    expect(mapPlaybackErrorKind('ERROR_CODE_DECODER_INIT_FAILED')).toBe('decode');
    expect(mapPlaybackErrorKind('ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED')).toBe('unsupported');
    expect(mapPlaybackErrorKind('ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED')).toBe('unsupported');
  });

  it('falls back to unknown for unmatched codes (including iOS item_failed)', () => {
    expect(mapPlaybackErrorKind('item_failed')).toBe('unknown');
    expect(mapPlaybackErrorKind('something_new')).toBe('unknown');
    expect(mapPlaybackErrorKind('')).toBe('unknown');
  });

  it('ignores surrounding whitespace', () => {
    expect(mapPlaybackErrorKind('  invalid_url  ')).toBe('invalid-source');
  });
});

describe('normalizePlaybackError', () => {
  it('attaches kind while preserving the raw code and message', () => {
    expect(
      normalizePlaybackError({ code: 'ERROR_CODE_IO_FILE_NOT_FOUND', message: 'gone' })
    ).toEqual({
      code: 'ERROR_CODE_IO_FILE_NOT_FOUND',
      kind: 'file-not-found',
      message: 'gone',
    });
  });

  it('keeps native detail for unknown codes', () => {
    expect(normalizePlaybackError({ code: 'item_failed', message: 'boom' })).toEqual({
      code: 'item_failed',
      kind: 'unknown',
      message: 'boom',
    });
  });
});
