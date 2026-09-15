import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers/medium';

import type { DownloadRecord } from '../../downloads/downloadTypes';
import { buildChannelFromDownload } from './buildChannelFromDownload';

const record = (overrides: Partial<DownloadRecord>): DownloadRecord => ({
  artworkUrl: null,
  byteSize: null,
  bytesDownloaded: 0,
  channelIdText: 'e2ePodChnl001',
  channelTitle: 'E2E Podcast Seed Channel',
  createdAt: 0,
  dismissedFromList: false,
  enclosureMime: 'audio/mpeg',
  enclosureUri: 'http://127.0.0.1/ep.mp3',
  enclosureUrlHash: 'hash',
  errorReason: null,
  fileExtension: 'mp3',
  filePath: 'file:///downloads/ep.mp3',
  itemIdText: 'e2ePodResume02',
  mediaType: 'audio',
  status: 'complete',
  title: 'E2E Podcast Resume Near End',
  updatedAt: 0,
  ...overrides,
});

describe('buildChannelFromDownload', () => {
  it('returns a podcast channel from an audio download row', () => {
    expect(buildChannelFromDownload(record({}))).toEqual({
      feed_id: 0,
      has_podcast_index_value: false,
      has_value_time_splits: false,
      id: 0,
      id_text: 'e2ePodChnl001',
      medium_id: MediumEnum.Podcast,
      podcast_guid: null,
      slug: null,
      sortable_title: null,
      title: 'E2E Podcast Seed Channel',
    });
  });

  it('returns null when the download has no channel id', () => {
    expect(buildChannelFromDownload(record({ channelIdText: null }))).toBeNull();
    expect(buildChannelFromDownload(record({ channelIdText: '' }))).toBeNull();
  });
});
