import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COOKIE_WRITE_INTENT_HEADER,
  COOKIE_WRITE_INTENT_VALUE,
} from '@podverse/helpers/cookieWriteIntent';

import { createRequestClient, request, toAuthHeaders } from './index.js';

vi.mock('axios', () => ({
  default: {
    request: vi.fn(async () => ({ status: 204, data: null, headers: {} })),
  },
}));

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

describe('cookie write intent header', () => {
  beforeEach(() => {
    vi.mocked(axios.request).mockClear();
    vi.mocked(axios.request).mockResolvedValue({ status: 204, data: null, headers: {} });
  });

  function sentHeaders(): Record<string, string> {
    const config: unknown = vi.mocked(axios.request).mock.calls[0]?.[0];
    if (config === null || typeof config !== 'object' || !('headers' in config)) {
      return {};
    }
    const headers = config.headers;
    if (headers === null || typeof headers !== 'object') {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }
    return result;
  }

  it('sends the header on an unsafe method with credentials', async () => {
    await request('https://api.example.com/playlist', {
      method: 'POST',
      withCredentials: true,
      data: { title: 'Morning' },
    });

    expect(sentHeaders()[COOKIE_WRITE_INTENT_HEADER]).toBe(COOKIE_WRITE_INTENT_VALUE);
  });

  it('sends the header on DELETE with credentials', async () => {
    await request('https://api.example.com/playlist/abc', {
      method: 'DELETE',
      withCredentials: true,
    });

    expect(sentHeaders()[COOKIE_WRITE_INTENT_HEADER]).toBe(COOKIE_WRITE_INTENT_VALUE);
  });

  it('omits the header on GET with credentials', async () => {
    await request('https://api.example.com/auth/me', {
      method: 'GET',
      withCredentials: true,
    });

    expect(sentHeaders()[COOKIE_WRITE_INTENT_HEADER]).toBeUndefined();
  });

  it('omits the header when the request does not send credentials', async () => {
    await request('https://api.example.com/playlist', {
      method: 'POST',
      data: { title: 'Morning' },
    });

    expect(sentHeaders()[COOKIE_WRITE_INTENT_HEADER]).toBeUndefined();
  });

  it('keeps a caller-supplied value', async () => {
    await request('https://api.example.com/playlist', {
      method: 'POST',
      withCredentials: true,
      headers: { [COOKIE_WRITE_INTENT_HEADER]: 'caller-value' },
    });

    expect(sentHeaders()[COOKIE_WRITE_INTENT_HEADER]).toBe('caller-value');
  });
});
