import type { PlaybackTarget } from '@podverse/playback-core';

/**
 * Public Podverse web base for share links (Track 11.13 placeholder). Track 15 will own the
 * canonical deep-link/path map; until then we build best-effort public URLs from resource id_texts
 * so the OS share sheet has something meaningful to share.
 */
const PODVERSE_PUBLIC_WEB_BASE_URL = 'https://podverse.fm';

/**
 * Build a public URL for the now-playing target, or `null` when none applies (e.g. add-by-RSS has
 * no public page). Callers treat `null` as a safe no-op (disabled share). Paths mirror the web
 * routes (`/episode`, `/clip`, `/podcast`).
 */
export function buildNowPlayingShareUrl(target: PlaybackTarget): string | null {
  switch (target.kind) {
    case 'clip':
      return `${PODVERSE_PUBLIC_WEB_BASE_URL}/clip/${target.clip.id_text}`;
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return `${PODVERSE_PUBLIC_WEB_BASE_URL}/episode/${target.item.id_text}`;
    case 'livestream':
      return `${PODVERSE_PUBLIC_WEB_BASE_URL}/podcast/${target.channel.id_text}`;
    case 'add-by-rss':
      return null;
  }
}
