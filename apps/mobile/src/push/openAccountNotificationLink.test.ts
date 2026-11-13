import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMobileHomePodcastEpisodePath } from '@podverse/helpers';

const queuePendingDeepLink = vi.fn();
const openURL = vi.fn(async (_url: string) => undefined);

vi.mock('../navigation/pendingDeepLink', () => ({
  queuePendingDeepLink: (...args: unknown[]) => queuePendingDeepLink(...args),
}));

vi.mock('react-native', () => ({
  Linking: {
    openURL: (url: string) => openURL(url),
  },
}));

describe('openAccountNotificationLink', () => {
  beforeEach(() => {
    queuePendingDeepLink.mockClear();
    openURL.mockClear();
  });

  it('queues an in-app path on the pending deep-link buffer', async () => {
    const { openAccountNotificationLink } = await import('./openAccountNotificationLink');

    await openAccountNotificationLink({
      link_path: null,
      payload: {
        channelIdText: 'chan123456',
        itemIdText: 'item123456',
        type: 'new-episode',
      },
    });

    expect(queuePendingDeepLink).toHaveBeenCalledWith(
      buildMobileHomePodcastEpisodePath('chan123456', 'item123456')
    );
    expect(openURL).not.toHaveBeenCalled();
  });

  it('opens an https link with Linking', async () => {
    const { openAccountNotificationLink } = await import('./openAccountNotificationLink');

    await openAccountNotificationLink({
      link_path: 'https://example.com/help',
      payload: null,
    });

    expect(openURL).toHaveBeenCalledWith('https://example.com/help');
    expect(queuePendingDeepLink).not.toHaveBeenCalled();
  });

  it('queues the notifications inbox path from link_path', async () => {
    const { openAccountNotificationLink } = await import('./openAccountNotificationLink');

    await openAccountNotificationLink({
      link_path: '/notifications',
      payload: null,
    });

    expect(queuePendingDeepLink).toHaveBeenCalledWith('/notifications');
    expect(openURL).not.toHaveBeenCalled();
  });
});
