import { toNonEmptyTrimmedString } from '@podverse/helpers/guards';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { PlaybackErrorEvent } from '../../modules/podverse-media-engine';
import { redactUrlCredentials } from '../data/repositories/syncEventLog';
import type { SyncEventLogDetails } from '../data/repositories/syncEventLog';
import type { SyncEventLogAppend } from '../data/repositories/syncEventLogRepository';
import { PLAYBACK_LOG_KIND } from '../sync/syncJobKinds';

/**
 * Error-log rows for playback failures.
 *
 * Podverse does not host media: every episode, track, and stream is fetched from the creator's own
 * server at the URL their feed publishes. A row therefore records the exact URL and the host's
 * HTTP status next to our ids, so support can tell a listener whether the host refused the file
 * or something on the device went wrong, and which feed item to look at.
 */

/** Code for a load that failed before the engine reported an error of its own. */
export const PLAYBACK_LOAD_FAILED_CODE = 'playback_load_failed';

const optionalUrl = (url: string | null | undefined): string | undefined => {
  const trimmed = toNonEmptyTrimmedString(url);
  return trimmed === null ? undefined : redactUrlCredentials(trimmed);
};

const optionalText = (value: unknown): string | undefined => {
  return toNonEmptyTrimmedString(value) ?? undefined;
};

const targetDetails = (target: PlaybackTarget | null): SyncEventLogDetails => {
  if (target === null) {
    return {};
  }
  switch (target.kind) {
    case 'add-by-rss': {
      const data = target.resourceData;
      const channelIdText = optionalText(data.channel_id_text);
      return {
        add_by_rss_id_text: optionalText(data.id_text),
        channel_title: optionalText(data.channel_title),
        // An add-by-RSS channel is identified by its feed URL.
        feed_url: optionalUrl(channelIdText),
        item_guid: optionalText(data.guid),
        item_title: optionalText(data.title),
        resource_kind: target.kind,
      };
    }
    case 'livestream':
      return {
        channel_id_text: target.channel.id_text,
        channel_title: optionalText(target.channel.title),
        item_id_text: optionalText(target.item?.id_text),
        item_title: optionalText(target.item?.title),
        resource_kind: target.kind,
      };
    default: {
      const base: SyncEventLogDetails = {
        channel_id_text: target.channel.id_text,
        channel_title: optionalText(target.channel.title),
        item_id_text: target.item.id_text,
        item_title: optionalText(target.item.title),
        resource_kind: target.kind,
      };
      if (target.kind === 'clip') {
        return { ...base, clip_id_text: target.clip.id_text };
      }
      if (target.kind === 'soundbite') {
        return { ...base, soundbite_id_text: target.soundbite.id_text };
      }
      if (target.kind === 'chapter') {
        return { ...base, chapter_id_text: target.chapter.id_text };
      }
      return base;
    }
  }
};

export type PlaybackErrorLogInput = {
  error: PlaybackErrorEvent;
  /** True when the source was a downloaded file on this device rather than the host's URL. */
  isLocalFile: boolean;
  /** The source URL handed to the engine: the enclosure, or the local file for a download. */
  mediaUrl: string | null;
  occurredAt: number;
  positionSeconds: number | null;
  target: PlaybackTarget | null;
};

/**
 * `http_<status>:<native code>` when the host answered with an error, so the code alone tells
 * support whose server refused. Otherwise the native code, or the load-failed code when the engine
 * never produced one.
 */
export const playbackErrorLogCode = (error: PlaybackErrorEvent): string => {
  const nativeCode = error.code.trim();
  if (error.httpStatus !== undefined) {
    const status = `http_${error.httpStatus}`;
    return nativeCode.length > 0 ? `${status}:${nativeCode}` : status;
  }
  return nativeCode.length > 0 ? nativeCode : PLAYBACK_LOAD_FAILED_CODE;
};

export const buildPlaybackErrorLog = ({
  error,
  isLocalFile,
  mediaUrl,
  occurredAt,
  positionSeconds,
  target,
}: PlaybackErrorLogInput): SyncEventLogAppend => {
  const errorCode = playbackErrorLogCode(error);
  const message = optionalText(error.message) ?? null;
  const media = optionalUrl(mediaUrl);
  const engineUrl = optionalUrl(error.url);
  const position =
    positionSeconds !== null && Number.isFinite(positionSeconds) && positionSeconds > 0
      ? String(Math.floor(positionSeconds))
      : undefined;
  let source: string | undefined;
  if (media !== undefined) {
    source = isLocalFile ? 'download' : 'stream';
  }

  return {
    details: {
      ...targetDetails(target),
      engine_url: engineUrl === media ? undefined : engineUrl,
      error_kind: error.kind,
      http_status: error.httpStatus === undefined ? undefined : String(error.httpStatus),
      media_url: media,
      native_code: optionalText(error.code),
      native_detail: optionalText(error.detail),
      position_seconds: position,
      source,
    },
    errorCode,
    jobKind: PLAYBACK_LOG_KIND,
    message: message === errorCode ? null : message,
    occurredAt,
    outcome: 'failure',
  };
};

/**
 * Identity of a failure for dedupe. Engines can report the same failure several times while an item
 * retries, and one broken enclosure should cost the capped log one row, not ten.
 */
export const playbackErrorLogSignature = (entry: SyncEventLogAppend): string => {
  return [
    entry.errorCode ?? '',
    entry.details?.media_url ?? '',
    entry.details?.item_id_text ?? entry.details?.add_by_rss_id_text ?? '',
  ].join('\u0000');
};
