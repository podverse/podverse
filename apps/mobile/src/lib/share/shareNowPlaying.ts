import { Share } from 'react-native';

import type { PlaybackTarget } from '@podverse/playback-core';

import { getMobileConfig } from '../../config';
import { presentShareSheet } from './shareSheetPassthrough';
import {
  buildNowPlayingShareUrl as buildNowPlayingShareUrlFromWebBaseUrl,
  buildPublicShareUrl as buildPublicShareUrlFromWebBaseUrl,
} from './shareUrl';
import type { ShareResource } from './shareUrl';

export const buildPublicShareUrl = (resource: ShareResource, idText: string): string => {
  return buildPublicShareUrlFromWebBaseUrl(getMobileConfig().webBaseUrl, resource, idText);
};

/**
 * Present the OS share sheet for a resolved public URL. `null` (no public page, e.g. add-by-RSS) is a
 * safe no-op, as is share-sheet dismissal / unavailability. Centralizes the share wiring reused by the
 * detail screens (podcast/episode/clip/playlist/profile) and the full player.
 */
export const shareResolvedUrl = (url: string | null): void => {
  if (url === null) {
    return;
  }
  void presentShareSheet(() => Share.share({ message: url, url }));
};

/**
 * Build a public URL for the now-playing target, or `null` when none applies (e.g. add-by-RSS has
 * no public page). Callers treat `null` as a safe no-op (disabled share). Paths mirror the web
 * routes (`/episode`, `/clip`, `/podcast`).
 */
export function buildNowPlayingShareUrl(target: PlaybackTarget): string | null {
  return buildNowPlayingShareUrlFromWebBaseUrl(getMobileConfig().webBaseUrl, target);
}
