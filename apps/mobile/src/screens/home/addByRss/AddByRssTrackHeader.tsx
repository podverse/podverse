import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { itemDetailDateLabel, TrackDetailHeader } from '../../../components/content';
import { useAddByRssArtworkHeaders } from '../../../hooks/useAddByRssArtworkHeaders';
import { itemDetailArtworkUri } from '../../../lib/content/itemDetailArtworkUri';
import { formatPlaybackDurationLabel } from '../../../lib/formatPlaybackDurationLabel';
import { itemDetailArtworkEdge } from '../../../theme/screenLayout';
import { useResponsive } from '../../../theme/useResponsive';
import type { AddByRssHomeEpisode } from '../addByRssHomeDetailData';
import type { QueueActionPosition } from '../useHomeRowPlayback';
import { useAddByRssDetailMoreActions } from './useAddByRssDetailMoreActions';

type AddByRssTrackHeaderProps = {
  albumTitle: string;
  feedUrl: string;
  onAddToPlaylistPress: () => void;
  onAlbumPress: () => void;
  onMarkAsPlayedPress: () => void;
  onPlayPress: () => void;
  onQueuePress: (position: QueueActionPosition) => void;
  track: AddByRssHomeEpisode;
};

/**
 * Identity and play bar for one Add by RSS track.
 *
 * Artwork is the full-width header square. The More menu is Queue Next, Queue Last, Add to
 * Playlist, Mark as Played, and Download. Add by RSS pages are not shareable, so Share is not
 * offered.
 */
export function AddByRssTrackHeader({
  albumTitle,
  feedUrl,
  onAddToPlaylistPress,
  onAlbumPress,
  onMarkAsPlayedPress,
  onPlayPress,
  onQueuePress,
  track,
}: AddByRssTrackHeaderProps) {
  const { t, i18n } = useTranslation();
  const { isTablet, width } = useResponsive();
  const artworkEdge = itemDetailArtworkEdge(width, isTablet);
  const artworkUri = itemDetailArtworkUri(
    track.itemBundle.images,
    null,
    artworkEdge,
    track.imageUrl
  );
  const artworkHeaders = useAddByRssArtworkHeaders(feedUrl, artworkUri);
  const dateLabel = useMemo(
    () => itemDetailDateLabel(track.itemBundle.item.pub_date, i18n.language),
    [i18n.language, track.itemBundle.item.pub_date]
  );
  const durationLabel =
    track.duration !== null && track.duration !== undefined
      ? formatPlaybackDurationLabel(Number(track.duration), t)
      : null;
  const moreActions = useAddByRssDetailMoreActions({
    downloadItem: track.downloadItem,
    idSuffix: `-${track.id}`,
    onAddToPlaylistPress,
    onMarkAsPlayedPress,
    onQueuePress,
  });

  return (
    <TrackDetailHeader
      albumTitle={albumTitle}
      artworkAddByRssFeedUrl={feedUrl}
      artworkHeaders={artworkHeaders}
      artworkUri={artworkUri}
      dateLabel={dateLabel}
      downloadItem={track.downloadItem}
      durationLabel={durationLabel}
      mediaIdText={track.id}
      moreActions={moreActions}
      onAlbumPress={onAlbumPress}
      onPlayPress={onPlayPress}
      testIDPrefix="add-by-rss-track-detail"
      title={track.title}
      viewerUri={artworkUri}
    />
  );
}
