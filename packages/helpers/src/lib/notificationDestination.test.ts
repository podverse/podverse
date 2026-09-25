import { describe, expect, it } from 'vitest';

import {
  APP_ROUTES,
  buildAlbumPath,
  buildEpisodePath,
  buildMobileHomeAlbumTrackPath,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  buildMobileSearchResultPath,
  buildMusicLivestreamPath,
  buildPodcastIndexFeedPath,
  buildPodcastLivestreamPath,
  buildPodcastPath,
  buildTrackPath,
  MOBILE_HOME_TAB_PATH,
} from './appRoutes.js';
import { MediumEnum } from './medium.js';
import {
  resolveNotificationDestination,
  resolveNotificationDestinationFromPayload,
} from './notificationDestination.js';

describe('resolveNotificationDestination', () => {
  it('builds a podcast > episode stack for new-episode', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'ch-1',
        itemIdText: 'ep-1',
        mediumId: MediumEnum.Podcast,
        messageType: 'new-episode',
      })
    ).toEqual({
      channelIdText: 'ch-1',
      itemIdText: 'ep-1',
      kind: 'episode',
      mobileStackPath: buildMobileHomePodcastEpisodePath('ch-1', 'ep-1'),
      webPath: buildEpisodePath('ep-1'),
    });
  });

  it('builds a podcast > episode stack for livestreams and links to the live item', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'ch-live',
        itemIdText: 'live-1',
        mediumId: MediumEnum.Podcast,
        messageType: 'livestream-started',
      })
    ).toEqual({
      channelIdText: 'ch-live',
      itemIdText: 'live-1',
      kind: 'livestream',
      mobileStackPath: buildMobileHomePodcastEpisodePath('ch-live', 'live-1'),
      webPath: buildPodcastLivestreamPath('live-1'),
    });
  });

  it('uses the music livestream prefix when the medium is music', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'ch-music',
        itemIdText: 'live-2',
        mediumId: MediumEnum.Music,
        messageType: 'livestream-scheduled',
      }).webPath
    ).toBe(buildMusicLivestreamPath('live-2'));
  });

  it('lands on the podcast when the type is a new channel', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'publisher-1',
        itemIdText: 'pod-1',
        messageType: 'new-podcast',
      })
    ).toMatchObject({
      kind: 'podcast',
      mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod-1'),
      webPath: buildPodcastPath('pod-1'),
    });
  });

  it('builds album > track for new-track', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'album-1',
        itemIdText: 'trk-1',
        messageType: 'new-track',
      })
    ).toMatchObject({
      kind: 'track',
      mobileStackPath: buildMobileHomeAlbumTrackPath('album-1', 'trk-1'),
      webPath: buildTrackPath('trk-1'),
    });
  });

  it('opens the local album for new-album', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'artist-1',
        itemIdText: 'album-1',
        mediumId: MediumEnum.PublisherMusic,
        messageType: 'new-album',
      })
    ).toMatchObject({
      kind: 'album',
      mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.ALBUM, 'album-1'),
      webPath: buildAlbumPath('album-1'),
    });
  });

  it('opens the Podcast Index preview for a podcast-index-feed notification', () => {
    expect(
      resolveNotificationDestination({
        channelIdText: 'artist-1',
        itemIdText: '42',
        messageType: 'podcast-index-feed',
      })
    ).toEqual({
      channelIdText: 'artist-1',
      itemIdText: '42',
      kind: 'path',
      mobileStackPath: buildMobileSearchResultPath('42'),
      webPath: buildPodcastIndexFeedPath('42'),
    });
  });

  it('keeps an explicit campaign path when no content type applies', () => {
    expect(
      resolveNotificationDestination({
        linkPath: APP_ROUTES.SETTINGS,
        messageType: 'new',
      })
    ).toEqual({
      channelIdText: null,
      itemIdText: null,
      kind: 'path',
      mobileStackPath: null,
      webPath: APP_ROUTES.SETTINGS,
    });
  });

  it('falls back to home when nothing is routable', () => {
    expect(resolveNotificationDestination({})).toEqual({
      channelIdText: null,
      itemIdText: null,
      kind: 'home',
      mobileStackPath: MOBILE_HOME_TAB_PATH,
      webPath: '/',
    });
  });
});

describe('resolveNotificationDestinationFromPayload', () => {
  it('reads the item-notification field names used on push and inbox rows', () => {
    expect(
      resolveNotificationDestinationFromPayload({
        channelIdText: 'ch-1',
        itemIdText: 'ep-1',
        mediumId: String(MediumEnum.Podcast),
        type: 'new-episode',
      }).mobileStackPath
    ).toBe(buildMobileHomePodcastEpisodePath('ch-1', 'ep-1'));
  });

  it('uses link_path for campaign rows', () => {
    expect(
      resolveNotificationDestinationFromPayload({
        campaign_id_text: 'camp-1',
        link_path: APP_ROUTES.SETTINGS,
      })
    ).toMatchObject({
      kind: 'path',
      webPath: APP_ROUTES.SETTINGS,
    });
  });

  it('maps legacy { type, id_text } resource payloads', () => {
    expect(
      resolveNotificationDestinationFromPayload({
        id_text: 'pod123',
        type: 'podcast',
      })
    ).toMatchObject({
      kind: 'podcast',
      mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123'),
      webPath: buildPodcastPath('pod123'),
    });
  });

  it('maps a Podcast Index link path on its own', () => {
    expect(
      resolveNotificationDestinationFromPayload({
        link_path: buildPodcastIndexFeedPath('42'),
      })
    ).toMatchObject({
      kind: 'path',
      mobileStackPath: buildMobileSearchResultPath('42'),
      webPath: buildPodcastIndexFeedPath('42'),
    });
  });

  it('returns home for empty payloads', () => {
    expect(resolveNotificationDestinationFromPayload(null).kind).toBe('home');
    expect(resolveNotificationDestinationFromPayload({}).kind).toBe('home');
  });
});
