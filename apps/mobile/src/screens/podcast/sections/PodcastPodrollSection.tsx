import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import type { RemoteItemsResponse } from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';

import { CoverImage, ListRow } from '../../../components/primitives';
import { channelToHomeRow, itemToHomeRow } from '../../../lib/rows/homeRowMappers';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../../navigation';
import { LIST_ROW_ARTWORK_SIZE } from '../../../theme/screenLayout';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPaneProps } from './podcastSectionPane';
import type { PodcastSectionPage } from './usePodcastSectionRows';
import { usePodcastSectionRows } from './usePodcastSectionRows';

/** Artwork sizing only, so it does not depend on the theme. Square, matching every other row. */
const styles = StyleSheet.create({
  image: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
});

type PodrollEntry = {
  imageUrl: string | null;
  key: string;
  subtitle: string | null;
  target: { idText: string; kind: 'channel' | 'episode' };
  title: string;
};

/**
 * A podroll names other people's feeds, and the endpoint answers with the ones this install can
 * actually open — a recommendation the directory has never seen has nowhere to go, so it is left out
 * rather than listed as a row that does nothing.
 */
const toPodrollEntries = (response: RemoteItemsResponse): PodrollEntry[] => {
  const entries: PodrollEntry[] = [];

  for (const channel of response.channelsAdded) {
    const row = channelToHomeRow(channel);
    if (row.id.length === 0) {
      continue;
    }
    entries.push({
      imageUrl: row.imageUrl,
      key: `channel-${row.id}`,
      subtitle: row.subtitle,
      target: { idText: row.id, kind: 'channel' },
      title: row.title,
    });
  }

  for (const item of response.itemsAdded) {
    const row = itemToHomeRow(item);
    if (row.id.length === 0) {
      continue;
    }
    entries.push({
      imageUrl: row.imageUrl,
      key: `episode-${row.id}`,
      subtitle: row.subtitle,
      target: { idText: row.id, kind: 'episode' },
      title: row.title,
    });
  }

  return entries;
};

/**
 * The podcasts and episodes this podcast recommends.
 *
 * The whole podroll arrives in one response, so there is no second page to reach for. The chip only
 * appears when the feed declared a podroll, which makes an empty list here the narrow case of a
 * declared podroll whose entries are all unknown to the directory.
 */
export function PodcastPodrollSection({
  channelIdText,
  listHeader,
  onRefreshChannel,
}: PodcastSectionPaneProps) {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList, 'PodcastDetail'>>();

  const fetchPage = useCallback(
    async (api: ApiRequestService): Promise<PodcastSectionPage<PodrollEntry>> => {
      const response = await api.reqPodrollGetForChannel(channelIdText);
      return { hasMore: false, rows: toPodrollEntries(response) };
    },
    [channelIdText]
  );

  const { errorKey, isInitialLoading, isRefreshing, refresh, retry, rows } =
    usePodcastSectionRows(fetchPage);

  const openEntry = useCallback(
    (entry: PodrollEntry) => {
      if (entry.target.kind === 'channel') {
        navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.PodcastDetail, {
          podcastId: entry.target.idText,
        });
        return;
      }

      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, {
        episodeId: entry.target.idText,
      });
    },
    [navigation]
  );

  return (
    <PodcastSectionList
      accessibilityLabel={t('info.podroll')}
      emptyMessageKey="info.no_podroll_found"
      errorKey={errorKey}
      isInitialLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      keyExtractor={(entry) => entry.key}
      listHeader={listHeader}
      onRefresh={() => {
        void onRefreshChannel();
        refresh();
      }}
      onRetry={retry}
      renderRow={({ index, row: entry }) => (
        <ListRow
          leading={
            <CoverImage
              fallbackLabel={t('media.image')}
              opensViewer={false}
              style={styles.image}
              uri={entry.imageUrl}
            />
          }
          onPress={() => {
            openEntry(entry);
          }}
          subtitle={entry.subtitle ?? undefined}
          testID={`podcast-podroll-row-${index}`}
          title={entry.title}
        />
      )}
      rows={rows}
      testID="podcast-detail-podroll-list"
    />
  );
}
