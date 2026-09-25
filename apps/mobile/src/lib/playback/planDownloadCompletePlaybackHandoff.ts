import type { PlaybackTarget } from '@podverse/playback-core';

import type { DownloadRecord } from '../../downloads/downloadTypes';

/**
 * How close a progress sample must be to the captured playhead before clocks follow the
 * local file. Wider than one progress tick, narrower than a reset-to-zero reading as "landed".
 */
export const DOWNLOAD_HANDOFF_POSITION_TOLERANCE_SECONDS = 1.5;

/** Stop holding the previous playhead if the engine never reports a landed seek. */
export const DOWNLOAD_HANDOFF_PROGRESS_SUPPRESS_MS = 3000;

export type DownloadCompleteHandoffRecord = Pick<
  DownloadRecord,
  'enclosureUri' | 'filePath' | 'itemIdText' | 'status'
>;

export type PlanDownloadCompletePlaybackHandoffParams = {
  /** Queue advance is already replacing the item; do not swap sources under it. */
  advancing: boolean;
  lastSourceUrl: string | null;
  record: DownloadCompleteHandoffRecord;
  /**
   * Same rewrite playback and the download transfer apply to enclosure URIs
   * (`resolveE2eMediaUrl`). The stored `enclosureUri` is pre-rewrite.
   */
  rewriteEnclosureUrl: (uri: string) => string;
  target: PlaybackTarget | null;
};

export type DownloadCompletePlaybackHandoff = {
  localUrl: string;
};

const itemIdFromPlaybackTarget = (target: PlaybackTarget): string | null => {
  switch (target.kind) {
    case 'add-by-rss':
    case 'livestream':
      return null;
    case 'chapter':
    case 'clip':
    case 'item-music':
    case 'item-podcast':
    case 'item-video':
    case 'soundbite':
      return target.item.id_text;
  }
};

const isRemoteHttpUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://');
};

const isLocalFileUrl = (url: string): boolean => {
  return url.startsWith('file://');
};

/**
 * When a download of the file currently streaming finishes, return the local URL to load.
 * Any other completion (different item, different enclosure, already local, not item-backed)
 * is ignored so playback is not yanked onto another encode.
 */
export function planDownloadCompletePlaybackHandoff(
  params: PlanDownloadCompletePlaybackHandoffParams
): DownloadCompletePlaybackHandoff | null {
  if (params.advancing || params.target === null) {
    return null;
  }

  const itemIdText = itemIdFromPlaybackTarget(params.target);
  if (itemIdText === null || itemIdText !== params.record.itemIdText) {
    return null;
  }

  const filePath = params.record.filePath;
  if (params.record.status !== 'complete' || filePath === null || !isLocalFileUrl(filePath)) {
    return null;
  }

  const lastSourceUrl = params.lastSourceUrl;
  if (lastSourceUrl === null || !isRemoteHttpUrl(lastSourceUrl)) {
    return null;
  }

  if (params.rewriteEnclosureUrl(params.record.enclosureUri) !== lastSourceUrl) {
    return null;
  }

  return { localUrl: filePath };
}

/**
 * True when a progress sample is the post-seek playhead of a source swap, not the `0` the
 * engine reports while the new item is replacing the old one.
 */
export function isDownloadHandoffProgressLanded(params: {
  positionSeconds: number;
  sawReady: boolean;
  seekSeconds: number;
  toleranceSeconds: number;
}): boolean {
  if (!params.sawReady) {
    return false;
  }
  if (Math.abs(params.positionSeconds - params.seekSeconds) > params.toleranceSeconds) {
    return false;
  }
  if (params.positionSeconds <= 0 && params.seekSeconds > params.toleranceSeconds) {
    return false;
  }
  return true;
}
