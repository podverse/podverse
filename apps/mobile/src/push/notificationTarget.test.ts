import { describe, expect, it } from 'vitest';

import {
  APP_ROUTES,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  buildPlaylistPath,
  buildProfilePath,
} from '@podverse/helpers';

import { extractNotificationTargetPath } from './notificationTarget';

describe('extractNotificationTargetPath', () => {
  it('prefers url when present', () => {
    expect(
      extractNotificationTargetPath({
        id_text: 'pod123',
        type: 'podcast',
        url: 'podverse-next://podcast/override123',
      })
    ).toBe('podverse-next://podcast/override123');
  });

  it('maps valid {type, id_text} payloads onto the Home stack', () => {
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: 'podcast' })).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123')
    );
    expect(extractNotificationTargetPath({ id_text: 'ep123', type: 'episode' })).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.EPISODE, 'ep123')
    );
    expect(extractNotificationTargetPath({ id_text: 'clip123', type: 'clip' })).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.CLIP, 'clip123')
    );
    expect(extractNotificationTargetPath({ id_text: 'pl123', type: 'playlist' })).toBe(
      buildPlaylistPath('pl123')
    );
    expect(extractNotificationTargetPath({ id_text: 'user123', type: 'profile' })).toBe(
      buildProfilePath('user123')
    );
  });

  it('builds Home > podcast > episode from item-notification payloads', () => {
    expect(
      extractNotificationTargetPath({
        channelIdText: 'ch-1',
        itemIdText: 'ep-1',
        type: 'new-episode',
      })
    ).toBe(buildMobileHomePodcastEpisodePath('ch-1', 'ep-1'));
  });

  it('builds Home > podcast > episode from livestream payloads', () => {
    expect(
      extractNotificationTargetPath({
        channelIdText: 'ch-live',
        itemIdText: 'live-1',
        type: 'livestream-started',
      })
    ).toBe(buildMobileHomePodcastEpisodePath('ch-live', 'live-1'));
  });

  it('uses explicit link_path payload targets when no content ids apply', () => {
    expect(
      extractNotificationTargetPath({
        category: 'general',
        link_path: '/notifications',
      })
    ).toBe('/notifications');
  });

  it('returns null when a category carries no explicit path', () => {
    expect(extractNotificationTargetPath({ category: 'general' })).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(extractNotificationTargetPath({ id_text: 'whatever', type: 'unknown' })).toBeNull();
  });

  it('returns null for missing, empty, or whitespace values', () => {
    expect(extractNotificationTargetPath(null)).toBeNull();
    expect(extractNotificationTargetPath(undefined)).toBeNull();
    expect(extractNotificationTargetPath({})).toBeNull();
    expect(extractNotificationTargetPath({ id_text: '', type: 'podcast' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: '' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: '   ', type: 'podcast' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: '   ' })).toBeNull();
    expect(extractNotificationTargetPath({ url: '   ' })).toBeNull();
  });

  it('returns null for non-string values', () => {
    expect(extractNotificationTargetPath({ id_text: 123, type: 'podcast' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: 123 })).toBeNull();
    expect(extractNotificationTargetPath({ url: 123 })).toBeNull();
  });
});
