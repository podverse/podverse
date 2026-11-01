import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { itemDetailDateLabel, ItemDetailHeader } from '../../../components/content';
import type { MediaRowMoreAction } from '../../../components/player/MediaRowActions';
import { useAddByRssArtworkHeaders } from '../../../hooks/useAddByRssArtworkHeaders';
import { toAddByRssLiveItemPlaybackResourceData } from '../../../lib/addByRss/domain';
import type { AddByRssLiveItemDetail } from '../../../lib/addByRss/liveItemDetail';
import { addByRssLiveStatusLabelKey } from '../../../lib/addByRss/liveItemDetail';
import { addByRssPlaybackMediaId } from '../../../lib/addByRss/resourceData';
import type { MobileAddByRSSFeedRecord } from '../../../prefs/addByRSSFeeds';
import { addByRssFeedHeaderArtwork } from '../addByRssHomeDetailData';

const NO_MORE_ACTIONS: MediaRowMoreAction[] = [];

type AddByRssLivestreamHeaderProps = {
  feed: MobileAddByRSSFeedRecord;
  liveItem: AddByRssLiveItemDetail;
  mappedFeed: AddByRSSMappedFeed;
  onChannelPress: () => void;
  onPlayPress?: () => void;
};

/**
 * Identity and play control for one Add by RSS livestream.
 *
 * Artwork is the full-width header square from the live item's own image, or the feed's artwork
 * when the item has none. Play is passed in only while the livestream is on the air. There are no
 * More actions.
 */
export function AddByRssLivestreamHeader({
  feed,
  liveItem,
  mappedFeed,
  onChannelPress,
  onPlayPress,
}: AddByRssLivestreamHeaderProps) {
  const { t, i18n } = useTranslation();
  const itemImage = liveItem.imageUrl;
  const headerArtwork = useMemo(
    () => addByRssFeedHeaderArtwork(feed, mappedFeed),
    [feed, mappedFeed]
  );
  // Prefer the largest known feed URL on a full-width square; the live item image has no size
  // metadata to hero-select against.
  const artworkUri = itemImage ?? headerArtwork.viewerUrl ?? headerArtwork.listUrl;
  const artworkHeaders = useAddByRssArtworkHeaders(feed.feedUrl, artworkUri);
  const playbackMediaId = useMemo(
    () =>
      addByRssPlaybackMediaId(
        toAddByRssLiveItemPlaybackResourceData(
          feed,
          mappedFeed,
          liveItem.liveBundle,
          liveItem.liveIndex
        )
      ),
    [feed, liveItem.liveBundle, liveItem.liveIndex, mappedFeed]
  );
  const dateLabel = useMemo(() => {
    const status = t(addByRssLiveStatusLabelKey(liveItem.statusId));
    const date = itemDetailDateLabel(liveItem.startTime, i18n.language);
    return date === null ? status : `${status} • ${date}`;
  }, [i18n.language, liveItem.startTime, liveItem.statusId, t]);

  return (
    <ItemDetailHeader
      artworkAddByRssFeedUrl={feed.feedUrl}
      artworkHeaders={artworkHeaders}
      artworkUri={artworkUri}
      channelTitle={feed.title ?? feed.feedUrl}
      dateLabel={dateLabel}
      downloadItem={null}
      durationLabel={null}
      mediaIdText={`${feed.idText}-${liveItem.liveItemKey}`}
      moreActions={NO_MORE_ACTIONS}
      onChannelPress={onChannelPress}
      onPlayPress={onPlayPress}
      playbackMediaId={playbackMediaId}
      testIDPrefix="add-by-rss-livestream-detail"
      title={liveItem.title ?? t('media.livestream.livestream')}
      viewerUri={itemImage ?? headerArtwork.viewerUrl}
    />
  );
}
