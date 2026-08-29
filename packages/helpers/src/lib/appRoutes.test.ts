import { describe, expect, it } from 'vitest';

import {
  APP_ROUTES,
  buildEpisodePath,
  buildNotificationLinkPath,
  buildPodcastLivestreamPath,
  getNotificationLinkPathPrefix,
} from './appRoutes.js';
import { MediumEnum } from './medium.js';

describe('appRoutes', () => {
  it('builds detail paths from APP_ROUTES prefixes', () => {
    expect(buildEpisodePath('ep-1')).toBe(`${APP_ROUTES.EPISODE}/ep-1`);
    expect(buildPodcastLivestreamPath('ch-1')).toBe(`${APP_ROUTES.PODCAST_LIVESTREAM}/ch-1`);
  });

  it('maps notification message types to path prefixes', () => {
    expect(getNotificationLinkPathPrefix('new-episode', MediumEnum.Podcast)).toBe(
      APP_ROUTES.EPISODE
    );
    expect(getNotificationLinkPathPrefix('livestream-started', MediumEnum.Music)).toBe(
      APP_ROUTES.MUSIC_LIVESTREAM
    );
    expect(getNotificationLinkPathPrefix('livestream-started', MediumEnum.Podcast)).toBe(
      APP_ROUTES.PODCAST_LIVESTREAM
    );
    expect(getNotificationLinkPathPrefix('new', MediumEnum.Podcast)).toBeNull();
  });

  it('builds full notification link paths', () => {
    expect(
      buildNotificationLinkPath({
        channelIdText: 'ch-1',
        itemIdText: 'item-1',
        mediumId: MediumEnum.Podcast,
        messageType: 'new-episode',
      })
    ).toBe(buildEpisodePath('item-1'));

    expect(
      buildNotificationLinkPath({
        channelIdText: 'ch-music',
        itemIdText: 'live-1',
        mediumId: MediumEnum.Music,
        messageType: 'livestream-started',
      })
    ).toBe(`${APP_ROUTES.MUSIC_LIVESTREAM}/ch-music`);
  });
});
