import { describe, expect, it, vi } from 'vitest';

import type { DTOItemEnclosure } from '@podverse/helpers';

import { beginDirectDownload } from './beginDirectDownload';

function enclosure(
  uri: string,
  type: string,
  extras: Partial<DTOItemEnclosure> = {}
): DTOItemEnclosure {
  return {
    id: 0,
    item_id: 0,
    type,
    item_enclosure_default: false,
    item_enclosure_integrity: null,
    item_enclosure_sources: [{ id: 0, item_enclosure_id: 0, uri }],
    ...extras,
  };
}

function run(enclosures: DTOItemEnclosure[]) {
  const setModalSourceSelector = vi.fn();
  const showToastPromiseWithLoading = vi.fn();
  const downloadAndSaveFile = vi.fn(() => Promise.resolve());
  const onIneligible = vi.fn();
  beginDirectDownload({
    enclosures,
    actionType: 'download-episode',
    itemTitle: 'Episode title',
    fallbackFilename: 'episode.mp3',
    setModalSourceSelector,
    showToastPromiseWithLoading,
    downloadAndSaveFile,
    messages: { loading: 'loading', success: 'success', error: 'error' },
    onIneligible,
  });
  return {
    setModalSourceSelector,
    showToastPromiseWithLoading,
    downloadAndSaveFile,
    onIneligible,
  };
}

describe('beginDirectDownload', () => {
  it('downloads the progressive file when an HLS playlist is also present', () => {
    const {
      downloadAndSaveFile,
      setModalSourceSelector,
      onIneligible,
      showToastPromiseWithLoading,
    } = run([
      enclosure('https://x/stream.m3u8', 'application/x-mpegurl', {
        item_enclosure_default: true,
      }),
      enclosure('https://x/ep.mp3', 'audio/mpeg'),
    ]);

    expect(downloadAndSaveFile).toHaveBeenCalledWith('https://x/ep.mp3', 'Episode title.mp3');
    expect(showToastPromiseWithLoading).toHaveBeenCalledOnce();
    expect(setModalSourceSelector).not.toHaveBeenCalled();
    expect(onIneligible).not.toHaveBeenCalled();
  });

  it('opens the source modal with only progressive files when more than one can be saved', () => {
    const { downloadAndSaveFile, setModalSourceSelector, onIneligible } = run([
      enclosure('https://x/ep.mp3', 'audio/mpeg'),
      enclosure('https://x/stream.m3u8', 'application/x-mpegurl'),
      enclosure('https://x/ep.mp4', 'video/mp4', { height: 720 }),
    ]);

    expect(downloadAndSaveFile).not.toHaveBeenCalled();
    expect(onIneligible).not.toHaveBeenCalled();
    expect(setModalSourceSelector).toHaveBeenCalledOnce();
    const offered = JSON.stringify(setModalSourceSelector.mock.calls[0]?.[0]);
    const audioIndex = offered.indexOf('https://x/ep.mp3');
    const videoIndex = offered.indexOf('https://x/ep.mp4');
    expect(audioIndex).toBeGreaterThanOrEqual(0);
    expect(videoIndex).toBeGreaterThan(audioIndex);
    expect(offered).not.toContain('m3u8');
  });

  it('reports an HLS-only item as ineligible and does not fetch it', () => {
    const { downloadAndSaveFile, setModalSourceSelector, onIneligible } = run([
      enclosure('https://x/stream.m3u8', 'application/x-mpegurl'),
    ]);

    expect(onIneligible).toHaveBeenCalledOnce();
    expect(downloadAndSaveFile).not.toHaveBeenCalled();
    expect(setModalSourceSelector).not.toHaveBeenCalled();
  });
});
