import type { DTOChannel, DTOVerifiedPublisher } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import type { DownloadRecord } from '../../downloads/downloadTypes';

/**
 * A playable channel identity from a completed download row, for Offline Mode when the stored
 * item DTO has no nested `channel` and the network channel fetch cannot run.
 * `verifiedPublishers` are the album's channel-wide publishers when the caller found them on the
 * stored item.
 */
export const buildChannelFromDownload = (
  record: DownloadRecord,
  verifiedPublishers?: DTOVerifiedPublisher[]
): DTOChannel | null => {
  const idText = record.channelIdText;
  if (idText === null || idText.length === 0) {
    return null;
  }

  return {
    feed_id: 0,
    has_value_time_splits: false,
    id: 0,
    id_text: idText,
    medium_id: record.mediaType === 'video' ? MediumEnum.Video : MediumEnum.Podcast,
    podcast_guid: null,
    slug: null,
    sortable_title: null,
    title: record.channelTitle,
    ...(verifiedPublishers === undefined ? {} : { verified_publishers: verifiedPublishers }),
  };
};
