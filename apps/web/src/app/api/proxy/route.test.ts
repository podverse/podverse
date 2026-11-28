import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import axios from 'axios';

const axiosRequest = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('axios must not be called');
  })
);

vi.mock('axios', () => ({
  default: {
    request: axiosRequest,
  },
}));

vi.mock('node:dns', () => {
  const lookup = vi.fn(async () => [{ address: '169.254.169.254', family: 4 }]);
  return {
    default: { promises: { lookup } },
    promises: { lookup },
  };
});

vi.mock('@podverse/helpers-backend', () => ({
  fetchWithTimeout: vi.fn(() => {
    throw new Error('direct fetch must not be called');
  }),
}));

vi.mock('../../../config', () => ({
  getConfig: () => ({
    public: { imageProxy: { enabled: true } },
    proxy: { responseCacheMaxAgeSeconds: 60, userAgent: 'PodverseTest' },
  }),
}));

vi.mock('../../../utils/proxy/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => ({
    allowed: true,
    remaining: 999,
    resetTime: Date.now() + 60_000,
  })),
}));

import { validateProxyUrl } from '../../../utils/proxy/urlValidator';
import { GET } from './route';

const imageUrl = 'https://images.example/cover.png';

describe('GET /api/proxy', () => {
  beforeEach(() => {
    axiosRequest.mockClear();
  });

  it('refuses a hostname the string checker allows when resolution is link-local', async () => {
    expect(validateProxyUrl(imageUrl).isValid).toBe(true);

    const response = await GET(
      new NextRequest(`http://localhost:4032/api/proxy?url=${encodeURIComponent(imageUrl)}`)
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid URL');
    expect(axios.request).not.toHaveBeenCalled();
  });
});
