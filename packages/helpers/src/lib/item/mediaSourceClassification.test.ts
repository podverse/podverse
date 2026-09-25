import { describe, expect, it } from 'vitest';

import {
  HLS_PLAYLIST_MIME_TYPE,
  classifyMediaSource,
  isHlsMimeType,
  isHlsSource,
  resolveDirectDownloadUri,
} from './mediaSourceClassification.js';

describe('isHlsSource', () => {
  it('detects .m3u8 paths with a query or hash', () => {
    expect(isHlsSource('https://x/stream.m3u8', null)).toBe(true);
    expect(isHlsSource('https://x/stream.m3u8?token=1', null)).toBe(true);
    expect(isHlsSource('https://x/stream.M3U8#frag', 'audio/mpeg')).toBe(true);
    expect(isHlsSource('https://x/stream.m3u8?file=episode.mp3', null)).toBe(true);
  });

  it('ignores .m3u8 that appears only in the query or hash', () => {
    expect(isHlsSource('https://x/ep.mp3?playlist=stream.m3u8', null)).toBe(false);
    expect(isHlsSource('https://x/ep.mp3#stream.m3u8', 'audio/mpeg')).toBe(false);
  });

  it('detects HLS MIME types, including parameters and mixed case', () => {
    expect(isHlsSource('https://x/stream', 'application/x-mpegurl')).toBe(true);
    expect(isHlsSource('https://x/stream', 'application/vnd.apple.mpegURL')).toBe(true);
    expect(isHlsSource('https://x/stream', 'audio/x-mpegurl')).toBe(true);
    expect(isHlsSource('https://x/stream', 'audio/mpegurl; charset=utf-8')).toBe(true);
    expect(isHlsMimeType('  Application/X-MpegURL  ')).toBe(true);
  });

  it('returns false for progressive media and non-media files', () => {
    expect(isHlsSource('https://x/ep.mp3', 'audio/mpeg')).toBe(false);
    expect(isHlsSource('https://x/ep.mp4?token=1', 'video/mp4')).toBe(false);
    expect(isHlsSource('https://x/page.html', 'text/html')).toBe(false);
    expect(isHlsSource('https://x/notes.pdf', 'application/pdf')).toBe(false);
    expect(isHlsSource('', null)).toBe(false);
    expect(isHlsSource('https://x/stream', null)).toBe(false);
    expect(isHlsSource('https://x/stream', '   ')).toBe(false);
  });
});

describe('classifyMediaSource', () => {
  it('classifies a query-string HLS playlist as hls and keeps the path extension', () => {
    expect(classifyMediaSource('https://x/live.m3u8?token=1', 'audio/mpeg')).toEqual({
      delivery: 'hls',
      extension: 'm3u8',
      mime: 'audio/mpeg',
    });
  });

  it('classifies a MIME-only HLS playlist and a progressive file', () => {
    expect(classifyMediaSource('https://x/live', 'application/vnd.apple.mpegurl')).toEqual({
      delivery: 'hls',
      extension: null,
      mime: 'application/vnd.apple.mpegurl',
    });
    expect(classifyMediaSource('https://x/ep.mp3?token=1', 'audio/mpeg')).toEqual({
      delivery: 'file',
      extension: 'mp3',
      mime: 'audio/mpeg',
    });
  });

  it('uses the canonical HLS playlist MIME constant for callers that need a type', () => {
    expect(HLS_PLAYLIST_MIME_TYPE).toBe('application/vnd.apple.mpegurl');
    expect(isHlsMimeType(HLS_PLAYLIST_MIME_TYPE)).toBe(true);
  });

  it('classifies the asset-server HLS playlist fixtures as HLS and blocks direct download', () => {
    const vodUrl = 'http://localhost:2111/e2e/hls/e2e-hls-vod.m3u8?fixture=vod';
    const eventUrl = 'http://localhost:2111/e2e/hls/e2e-hls-event.m3u8';
    expect(classifyMediaSource(vodUrl, 'audio/mpeg')).toEqual({
      delivery: 'hls',
      extension: 'm3u8',
      mime: 'audio/mpeg',
    });
    expect(classifyMediaSource(eventUrl, null).delivery).toBe('hls');
    expect(resolveDirectDownloadUri(vodUrl, 'audio/mpeg')).toEqual({
      ok: false,
      reason: 'hls_playlist',
    });
  });
});

describe('resolveDirectDownloadUri', () => {
  it('returns a trimmed progressive URI', () => {
    expect(resolveDirectDownloadUri('  https://x/ep.mp3?token=1  ', 'audio/mpeg')).toEqual({
      ok: true,
      uri: 'https://x/ep.mp3?token=1',
    });
  });

  it('blocks an HLS playlist and empty input', () => {
    expect(resolveDirectDownloadUri('https://x/stream.m3u8?token=1', 'audio/mpeg')).toEqual({
      ok: false,
      reason: 'hls_playlist',
    });
    expect(resolveDirectDownloadUri('https://x/stream', 'audio/mpegurl')).toEqual({
      ok: false,
      reason: 'hls_playlist',
    });
    expect(resolveDirectDownloadUri('   ', null)).toEqual({ ok: false, reason: 'missing_uri' });
    expect(resolveDirectDownloadUri(null, null)).toEqual({ ok: false, reason: 'missing_uri' });
    expect(resolveDirectDownloadUri(undefined, 'audio/mpeg')).toEqual({
      ok: false,
      reason: 'missing_uri',
    });
  });

  it('still returns non-media file URIs', () => {
    expect(resolveDirectDownloadUri('https://x/page.html', 'text/html')).toEqual({
      ok: true,
      uri: 'https://x/page.html',
    });
  });
});
