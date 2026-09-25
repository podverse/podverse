import { describe, expect, it, vi } from 'vitest';

import { startProgressiveDownload } from './startProgressiveDownload';

function params(
  uri: string | null,
  mime: string | null,
  downloadAndSaveFile: (url: string, filename: string) => Promise<void>,
  showToastPromiseWithLoading: (
    promise: Promise<void>,
    messages: { loading: string; success: string; error: string }
  ) => void
) {
  return {
    uri,
    mime,
    itemTitle: 'Episode title',
    fallbackFilename: 'episode.mp3',
    downloadAndSaveFile,
    showToastPromiseWithLoading,
    messages: {
      loading: 'loading',
      success: 'success',
      error: 'error',
    },
  };
}

describe('startProgressiveDownload', () => {
  it('downloads a progressive file', () => {
    const downloadAndSaveFile = vi.fn(() => Promise.resolve());
    const showToastPromiseWithLoading = vi.fn();
    const result = startProgressiveDownload(
      params(
        ' https://x/ep.mp3?token=1 ',
        'audio/mpeg',
        downloadAndSaveFile,
        showToastPromiseWithLoading
      )
    );

    expect(result).toEqual({ ok: true, uri: 'https://x/ep.mp3?token=1' });
    expect(downloadAndSaveFile).toHaveBeenCalledWith(
      'https://x/ep.mp3?token=1',
      'Episode title.mp3'
    );
    expect(showToastPromiseWithLoading).toHaveBeenCalledOnce();
  });

  it('does not fetch an HLS playlist', () => {
    const downloadAndSaveFile = vi.fn(() => Promise.resolve());
    const showToastPromiseWithLoading = vi.fn();
    const result = startProgressiveDownload(
      params(
        'https://x/stream.m3u8?token=1',
        'audio/mpeg',
        downloadAndSaveFile,
        showToastPromiseWithLoading
      )
    );

    expect(result).toEqual({ ok: false, reason: 'hls_playlist' });
    expect(downloadAndSaveFile).not.toHaveBeenCalled();
    expect(showToastPromiseWithLoading).not.toHaveBeenCalled();
  });

  it('does not fetch a document or a non-http URI', () => {
    const downloadAndSaveFile = vi.fn(() => Promise.resolve());
    const showToastPromiseWithLoading = vi.fn();

    expect(
      startProgressiveDownload(
        params('https://x/page.html', 'text/html', downloadAndSaveFile, showToastPromiseWithLoading)
      )
    ).toEqual({ ok: false, reason: 'unsupported_source' });
    expect(
      startProgressiveDownload(
        params('ftp://x/ep.mp3', 'audio/mpeg', downloadAndSaveFile, showToastPromiseWithLoading)
      )
    ).toEqual({ ok: false, reason: 'unsupported_source' });
    expect(downloadAndSaveFile).not.toHaveBeenCalled();
    expect(showToastPromiseWithLoading).not.toHaveBeenCalled();
  });

  it('does not fetch a missing URI', () => {
    const downloadAndSaveFile = vi.fn(() => Promise.resolve());
    const showToastPromiseWithLoading = vi.fn();
    const result = startProgressiveDownload(
      params(null, null, downloadAndSaveFile, showToastPromiseWithLoading)
    );

    expect(result).toEqual({ ok: false, reason: 'missing_uri' });
    expect(downloadAndSaveFile).not.toHaveBeenCalled();
  });
});
