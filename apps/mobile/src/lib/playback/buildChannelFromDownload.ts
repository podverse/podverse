import type { DTOChannel } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import type { DownloadRecord } from '../../downloads/downloadTypes';

/**
 * A playable channel identity from a completed download row, for Offline Mode when the stored
 * item DTO has no nested `channel` and the network channel fetch cannot run.
 */
export const buildChannelFromDownload = (record: DownloadRecord): DTOChannel | null => {
  const idText = record.channelIdText;
  if (idText === null || idText.length === 0) {
    return null;
  }

  return {
    feed_id: 0,
    has_podcast_index_value: false,
    has_value_time_splits: false,
    id: 0,
    id_text: idText,
    medium_id: record.mediaType === 'video' ? MediumEnum.Video : MediumEnum.Podcast,
    podcast_guid: null,
    slug: null,
    sortable_title: null,
    title: record.channelTitle,
  };
};
