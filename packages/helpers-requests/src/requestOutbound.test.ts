import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES, requestForOutbound } from './_request.js';
import { OutboundUrlBlockedError } from './outboundHttpPolicy.js';

vi.mock('axios', () => ({
  default: {
    request: vi.fn(() =>
      Promise.resolve({
        status: 200,
        data: '',
        headers: {},
        statusText: 'OK',
        config: {} as import('axios').InternalAxiosRequestConfig,
      })
    ),
  },
}));

describe('requestForOutbound', () => {
  beforeEach(() => {
    vi.mocked(axios.request).mockClear();
  });

  afterEach(() => {
    vi.mocked(axios.request).mockClear();
  });

  it('does not call axios when URL fails SSRF validation', async () => {
    await expect(requestForOutbound('http://127.0.0.1/')).rejects.toThrow(OutboundUrlBlockedError);
    expect(axios.request).not.toHaveBeenCalled();
  });

  it('sets maxContentLength for allowed URLs', async () => {
    await requestForOutbound('http://1.1.1.1/feed.xml');

    expect(axios.request).toHaveBeenCalledTimes(1);
    const cfg = vi.mocked(axios.request).mock.calls[0]?.[0];
    expect(cfg).toMatchObject({
      url: 'http://1.1.1.1/feed.xml',
      maxContentLength: DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES,
      maxBodyLength: DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES,
    });
    expect(typeof cfg?.beforeRedirect).toBe('function');
  });
});
