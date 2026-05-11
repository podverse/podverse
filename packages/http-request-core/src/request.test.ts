import { describe, expect, it } from 'vitest';

import { createRequestClient, toAuthHeaders } from './index.js';

describe('authContext', () => {
  it('maps cookie context to Cookie header', () => {
    expect(toAuthHeaders({ mode: 'cookie', cookieName: 'jwt', token: 'abc' })).toEqual({
      Cookie: 'jwt=abc',
    });
  });

  it('maps bearer context to Authorization by default', () => {
    expect(toAuthHeaders({ mode: 'bearer', token: 'abc' })).toEqual({
      Authorization: 'Bearer abc',
    });
  });
});

describe('createRequestClient', () => {
  it('returns request functions', () => {
    const client = createRequestClient();
    expect(typeof client.request).toBe('function');
    expect(typeof client.requestWithHeaders).toBe('function');
  });
});
