import { Share } from 'react-native';

import type { DTOPlaybackResourceSummary } from '@podverse/helpers/accountPlaybackStream';
import type { PlaybackTarget } from '@podverse/playback-core';

import { getMobileConfig } from '../../config';
import { resolvePublicWebBaseUrl } from '../../config/customApiUrl';
import { presentShareSheet } from './shareSheetPassthrough';
import type { ShareResource } from './shareUrl';
import {
  buildNowPlayingShareUrl as buildNowPlayingShareUrlFromWebBaseUrl,
  buildPublicShareUrl as buildPublicShareUrlFromWebBaseUrl,
  buildRemotePlaybackShareUrl as buildRemotePlaybackShareUrlFromWebBaseUrl,
} from './shareUrl';

const shareWebBaseUrl = (): string | null => {
  const config = getMobileConfig();
  return resolvePublicWebBaseUrl(
    config.webBaseUrl,
    config.customApiBaseUrl,
    config.customApiWebOrigin
  );
};

export const buildPublicShareUrl = (resource: ShareResource, idText: string): string | null => {
  return buildPublicShareUrlFromWebBaseUrl(shareWebBaseUrl(), resource, idText);
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
  return buildNowPlayingShareUrlFromWebBaseUrl(shareWebBaseUrl(), target);
}

/**
 * Public URL for the item another device is playing, or `null` when it has no public page
 * (Add by RSS). Callers treat `null` as a disabled Share button.
 */
export function buildRemotePlaybackShareUrl(
  resource: DTOPlaybackResourceSummary,
  isLive: boolean
): string | null {
  return buildRemotePlaybackShareUrlFromWebBaseUrl(shareWebBaseUrl(), resource, isLive);
}
