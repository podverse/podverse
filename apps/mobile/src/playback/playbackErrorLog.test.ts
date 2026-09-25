import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

import {
  buildPlaybackErrorLog,
  PLAYBACK_CREDENTIALS_WITHHELD_OTHER_DOMAIN_CODE,
  PLAYBACK_LOAD_FAILED_CODE,
  playbackErrorLogCode,
  playbackErrorLogSignature,
} from './playbackErrorLog';

// Partial DTO fixtures: the builder reads ids and titles only.
const channel = { id_text: 'ch1', title: 'Some show' } as DTOChannel;
const item = { id_text: 'ep1', title: 'Episode one' } as DTOItem;
const clip = { id_text: 'clip1' } as DTOClip;

const episodeTarget: PlaybackTarget = { channel, item, kind: 'item-podcast' };

describe('playbackErrorLogCode', () => {
  it('leads with the host status so the code alone says whose server refused', () => {
    expect(
      playbackErrorLogCode({ code: 'item_failed', httpStatus: 404, kind: 'host-http', message: '' })
    ).toBe('http_404:item_failed');
    expect(
      playbackErrorLogCode({ code: '', httpStatus: 403, kind: 'host-http', message: '' })
    ).toBe('http_403');
  });

  it('falls back to the native code, then to the load-failed code', () => {
    expect(
      playbackErrorLogCode({ code: 'ERROR_CODE_DECODING_FAILED', kind: 'decode', message: '' })
    ).toBe('ERROR_CODE_DECODING_FAILED');
    expect(playbackErrorLogCode({ code: ' ', kind: 'unknown', message: '' })).toBe(
      PLAYBACK_LOAD_FAILED_CODE
    );
  });
});

describe('buildPlaybackErrorLog', () => {
  it('records the host status, media URL, and our ids for a streamed episode', () => {
    expect(
      buildPlaybackErrorLog({
        error: {
          code: 'ERROR_CODE_IO_BAD_HTTP_STATUS',
          detail: 'InvalidResponseCodeException: Response code: 404',
          httpStatus: 404,
          kind: 'host-http',
          message: 'Source error',
          url: 'https://cdn.host.example/ep1.mp3',
        },
        isLocalFile: false,
        mediaUrl: 'https://user:secret@host.example/ep1.mp3?t=1',
        occurredAt: 5000,
        positionSeconds: 61.7,
        target: episodeTarget,
      })
    ).toEqual({
      details: {
        channel_id_text: 'ch1',
        channel_title: 'Some show',
        engine_url: 'https://cdn.host.example/ep1.mp3',
        error_kind: 'host-http',
        http_status: '404',
        item_id_text: 'ep1',
        item_title: 'Episode one',
        media_url: 'https://host.example/ep1.mp3?t=1',
        native_code: 'ERROR_CODE_IO_BAD_HTTP_STATUS',
        native_detail: 'InvalidResponseCodeException: Response code: 404',
        position_seconds: '61',
        resource_kind: 'item-podcast',
        source: 'stream',
      },
      errorCode: 'http_404:ERROR_CODE_IO_BAD_HTTP_STATUS',
      jobKind: 'playback',
      message: 'Source error',
      occurredAt: 5000,
      outcome: 'failure',
    });
  });

  it('omits the engine URL when it matches the source, and marks a download', () => {
    const entry = buildPlaybackErrorLog({
      error: {
        code: 'file_not_found',
        kind: 'file-not-found',
        message: 'file_not_found',
        url: 'file:///d/ep1.mp3',
      },
      isLocalFile: true,
      mediaUrl: 'file:///d/ep1.mp3',
      occurredAt: 1,
      positionSeconds: 0,
      target: { channel, clip, item, kind: 'clip' },
    });
    expect(entry.details?.engine_url).toBeUndefined();
    expect(entry.details?.source).toBe('download');
    expect(entry.details?.clip_id_text).toBe('clip1');
    expect(entry.details?.position_seconds).toBeUndefined();
    expect(entry.message).toBeNull();
  });

  it('identifies an add-by-RSS item by its feed URL and guid', () => {
    const entry = buildPlaybackErrorLog({
      error: { code: '', kind: 'unknown', message: '' },
      isLocalFile: false,
      mediaUrl: null,
      occurredAt: 1,
      positionSeconds: null,
      target: {
        kind: 'add-by-rss',
        resourceData: {
          channel_id_text: 'https://host.example/feed.xml',
          channel_title: 'Feed show',
          guid: 'guid-1',
          id_text: 'abr1',
          title: 'Feed episode',
        },
      },
    });
    expect(entry.errorCode).toBe(PLAYBACK_LOAD_FAILED_CODE);
    expect(entry.details).toMatchObject({
      add_by_rss_id_text: 'abr1',
      channel_title: 'Feed show',
      feed_url: 'https://host.example/feed.xml',
      item_guid: 'guid-1',
      item_title: 'Feed episode',
      resource_kind: 'add-by-rss',
    });
    expect(entry.details?.source).toBeUndefined();
  });

  it('names the credential outcome when a protected add-by-RSS host refuses the file', () => {
    const base = {
      error: { code: 'item_failed', httpStatus: 401, kind: 'host-http' as const, message: 'x' },
      isLocalFile: false,
      mediaUrl: 'https://cdn.other.example/ep.mp3',
      occurredAt: 1,
      positionSeconds: null,
      target: {
        kind: 'add-by-rss' as const,
        resourceData: { feed_url: 'https://host.example/feed.xml', id_text: 'abr1' },
      },
    };
    const withheld = buildPlaybackErrorLog({
      ...base,
      credentialsState: 'withheld_other_domain',
    });
    expect(withheld.errorCode).toBe(PLAYBACK_CREDENTIALS_WITHHELD_OTHER_DOMAIN_CODE);
    expect(withheld.details).toMatchObject({
      basic_auth: 'withheld_other_domain',
      feed_url: 'https://host.example/feed.xml',
      http_status: '401',
    });
    expect(buildPlaybackErrorLog({ ...base, credentialsState: 'sent' }).errorCode).toBe(
      'add_by_rss_credentials_rejected'
    );
    expect(buildPlaybackErrorLog({ ...base, credentialsState: 'not_stored' }).errorCode).toBe(
      'add_by_rss_credentials_required'
    );
    const notFound = buildPlaybackErrorLog({
      ...base,
      credentialsState: 'withheld_other_domain',
      error: { ...base.error, httpStatus: 404 },
    });
    expect(notFound.errorCode).toBe('http_404:item_failed');
    expect(notFound.details?.basic_auth).toBe('withheld_other_domain');
  });
});

describe('playbackErrorLogSignature', () => {
  it('treats a repeat of the same failure on the same media as one', () => {
    const input = {
      error: { code: 'item_failed', httpStatus: 503, kind: 'host-http' as const, message: 'x' },
      isLocalFile: false,
      mediaUrl: 'https://host.example/ep1.mp3',
      occurredAt: 1,
      positionSeconds: 10,
      target: episodeTarget,
    };
    const first = buildPlaybackErrorLog(input);
    const repeat = buildPlaybackErrorLog({ ...input, occurredAt: 2, positionSeconds: 11 });
    const other = buildPlaybackErrorLog({
      ...input,
      error: { ...input.error, httpStatus: 404 },
    });
    expect(playbackErrorLogSignature(repeat)).toBe(playbackErrorLogSignature(first));
    expect(playbackErrorLogSignature(other)).not.toBe(playbackErrorLogSignature(first));
  });
});
