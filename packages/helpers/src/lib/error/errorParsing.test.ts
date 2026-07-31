import { describe, expect, it } from 'vitest';

import {
  getErrorResponseBody,
  getErrorResponseBodyCode,
  getErrorResponseBodyMessage,
  getErrorResponseStatus,
} from './errorParsing.js';

describe('request error parsing', () => {
  it('reads response status and body code', () => {
    const error = { response: { data: { code: 'request_failed' }, status: 429 } };
    expect(getErrorResponseStatus(error)).toBe(429);
    expect(getErrorResponseBodyCode(error)).toBe('request_failed');
  });

  it('reads response body data and messages', () => {
    const responseData = { message: 'Response problem' };
    const error = { response: { data: responseData } };
    expect(getErrorResponseBody(error)).toBe(responseData);
    expect(getErrorResponseBodyMessage(error)).toBe('Response problem');
  });

  it('returns undefined for absent or empty response body messages', () => {
    expect(getErrorResponseBody('problem')).toBeUndefined();
    expect(getErrorResponseBodyMessage({ response: { data: { message: '  ' } } })).toBeUndefined();
  });
});
