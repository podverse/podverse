import { describe, expect, it } from 'vitest';

import { isTlsOrProtocolError } from './isTlsOrProtocolError.js';

describe('isTlsOrProtocolError', () => {
  it('returns true for EPROTO wrong version number messages', () => {
    const error = new Error(
      'Unknown Error: write EPROTO C0204EF801000000:error:0A00010B:SSL routines:tls_validate_record_header:wrong version number'
    );
    expect(isTlsOrProtocolError(error)).toBe(true);
  });

  it('returns true for unsupported protocol messages', () => {
    expect(isTlsOrProtocolError(new Error('unsupported protocol'))).toBe(true);
  });

  it('returns false for generic HTTP errors', () => {
    const error = new Error('HTTP Error: 404 - Not Found');
    expect(isTlsOrProtocolError(error)).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isTlsOrProtocolError(null)).toBe(false);
    expect(isTlsOrProtocolError({ status: 500 })).toBe(false);
  });
});
