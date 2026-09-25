import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCredentialsMock } = vi.hoisted(() => ({
  getCredentialsMock: vi.fn(),
}));

vi.mock('./credentialStore', () => ({
  getCredentials: getCredentialsMock,
}));

import { getAddByRSSChaptersTranscriptCredentials } from './chaptersTranscript';

const feedUrl = 'https://feeds.example.com/private.xml';

describe('getAddByRSSChaptersTranscriptCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCredentialsMock.mockResolvedValue({ username: 'listener', password: 'hunter2' });
  });

  it('sends stored credentials when a resource is within the feed domain', async () => {
    await expect(
      getAddByRSSChaptersTranscriptCredentials({
        accountId: 'account-1',
        feedUrl,
        resourceUrls: ['https://cdn.other.net/chapters.json', 'https://media.example.com/t.vtt'],
      })
    ).resolves.toEqual({ basic_auth_username: 'listener', basic_auth_password: 'hunter2' });
    expect(getCredentialsMock).toHaveBeenCalledWith('account-1', feedUrl);
  });

  it('keeps credentials on the device when every resource is on another domain', async () => {
    await expect(
      getAddByRSSChaptersTranscriptCredentials({
        accountId: 'account-1',
        feedUrl,
        resourceUrls: ['https://cdn.other.net/chapters.json', undefined],
      })
    ).resolves.toEqual({});
    expect(getCredentialsMock).not.toHaveBeenCalled();
  });

  it('sends nothing when the device has no credentials or no account', async () => {
    getCredentialsMock.mockResolvedValue(null);
    await expect(
      getAddByRSSChaptersTranscriptCredentials({
        accountId: 'account-1',
        feedUrl,
        resourceUrls: ['https://feeds.example.com/chapters.json'],
      })
    ).resolves.toEqual({});
    await expect(
      getAddByRSSChaptersTranscriptCredentials({
        accountId: null,
        feedUrl,
        resourceUrls: ['https://feeds.example.com/chapters.json'],
      })
    ).resolves.toEqual({});
  });
});
