import { describe, expect, it, vi } from 'vitest';

import { fetchMbrssV1PublicMessages, fetchMbV1PublicMessages } from './publicMessages.js';

describe('public messages URL fetching', () => {
  it('fetchMbrssV1PublicMessages uses capability-provided bucket URL with channel scope', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        messages: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchMbrssV1PublicMessages(
      'https://api.example.com/v1/custom/mbrss-v1/messages/public/bucket123',
      { type: 'channel', podcastGuid: 'pod-guid' }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/custom/mbrss-v1/messages/public/bucket123/channel/pod-guid',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
    );

    vi.unstubAllGlobals();
  });

  it('fetchMbV1PublicMessages uses capability-provided bucket URL as-is', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        messages: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchMbV1PublicMessages('https://api.example.com/v2/custom/mb-v1/messages/public/xyz');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v2/custom/mb-v1/messages/public/xyz',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
    );

    vi.unstubAllGlobals();
  });
});
