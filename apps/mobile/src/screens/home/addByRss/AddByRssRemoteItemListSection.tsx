import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactElement, ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS } from '@podverse/helpers/dto';
import { getChannelRouteKind, getItemTypeFromMedium } from '@podverse/helpers/medium';
import type { AddByRSSRemoteItemList } from '@podverse/parser-mapping';
import {
  toAddByRSSRemoteItemLookupRef,
  toAddByRSSRemoteItemResolveRef,
} from '@podverse/parser-mapping';

import { requestWithMobileAuthRefresh } from '../../../auth';
import { useAuth } from '../../../auth/AuthProvider';
import { useAuthPrompt } from '../../../auth/AuthPromptContext';
import { AlbumListRow } from '../../../components/content';
import { HelperNote } from '../../../components/feedback/HelperNote';
import { addByRssRepository } from '../../../data/repositories';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../../lib/offlineModeViews';
import { handleRateLimitMessage } from '../../../lib/rateLimit/handleRateLimitMessage';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import {
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  buildSearchResultDetailParams,
  buildTrackDetailParams,
  CHANNEL_BROWSE_STACK_ROUTES,
} from '../../../navigation';
import type { MobileAddByRSSFeedRecord } from '../../../prefs/addByRSSFeeds';
import { useOfflineMode } from '../../../prefs/offlineMode';
import { PodcastSectionList } from '../../podcast/sections/PodcastSectionList';
import type { AddByRssRemoteEntry } from './addByRssRemoteItems';
import {
  applyRemoteLookup,
  artworkAddByRssFeedUrlForEntry,
  getAddByRssRemoteRefsForDetail,
  remoteEntryDisplayTitle,
  remoteFeedDetailParamsForRef,
  remoteRefKey,
  toInitialRemoteEntries,
} from './addByRssRemoteItems';
import type { AddByRssSectionPaneProps } from './addByRssSectionPane';
import type { AddByRssDetailStackParamList } from './addByRssStackParams';

type RemoteListNavigation = NativeStackNavigationProp<
  ChannelBrowseStackParamList & AddByRssDetailStackParamList
>;

const listSlugFor = (list: AddByRSSRemoteItemList): 'podroll' | 'remote-items' =>
  list === 'podroll' ? 'podroll' : 'remote-items';

const emptyMessageKeyFor = (list: AddByRSSRemoteItemList): string =>
  list === 'podroll' ? 'info.no_podroll_found' : 'info.no_remote_items_found';

const labelKeyFor = (list: AddByRSSRemoteItemList): string =>
  list === 'podroll' ? 'info.podroll' : 'info.remote_items';

const entryKey = (entry: AddByRssRemoteEntry): string => entry.key;

type RemoteRowProps = {
  busy: boolean;
  entry: AddByRssRemoteEntry;
  index: number;
  listSlug: string;
  onPress: (entry: AddByRssRemoteEntry) => void;
  untitledLabel: string;
};

const RemoteRow = memo(function RemoteRow({
  busy,
  entry,
  index,
  listSlug,
  onPress,
  untitledLabel,
}: RemoteRowProps) {
  const title = remoteEntryDisplayTitle(entry, untitledLabel);
  const handlePress = useCallback(() => {
    onPress(entry);
  }, [entry, onPress]);

  return (
    <AlbumListRow
      accessibilityLabel={title}
      addByRssFeedUrl={artworkAddByRssFeedUrlForEntry(entry)}
      busy={busy}
      imageUrl={entry.imageUrl}
      onPress={handlePress}
      subtitle={entry.subtitle ?? undefined}
      testID={`add-by-rss-${listSlug}-row-${index}`}
      title={title}
    />
  );
});

/**
 * Podroll or Remote Items for one Add by RSS feed, read from the stored bundle.
 *
 * A feed already on the device opens that feed. A directory channel or item opens its screen.
 * A stored stub opens the provider preview for its feed. Anything else is resolved on tap, and
 * that request carries only the remote feed's GUID or URL.
 */
export function AddByRssRemoteItemListSection({
  detail,
  list,
  listHeader,
  onRefresh,
}: AddByRssSectionPaneProps & { list: AddByRSSRemoteItemList }): ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<RemoteListNavigation>();
  const { onRequestLogin } = useAuthPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const untitledLabel = t('misc.untitled');
  const listSlug = listSlugFor(list);
  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const [entries, setEntries] = useState<AddByRssRemoteEntry[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const generationRef = useRef(0);
  const openingRef = useRef(false);
  const refreshingRef = useRef(false);
  const feedIdText = detail.feed.idText;
  const mappedFeed = detail.mappedFeed;

  useEffect(() => {
    const generation = ++generationRef.current;
    const isRefresh = refreshingRef.current;
    const isCurrent = () => generationRef.current === generation;

    if (!isRefresh) {
      setIsInitialLoading(true);
      setEntries([]);
      setNotice(null);
    }
    setErrorKey(null);

    const refs = getAddByRssRemoteRefsForDetail(detail, list);

    void (async () => {
      try {
        const deviceFeedByRefKey = new Map<string, MobileAddByRSSFeedRecord>();
        await Promise.all(
          refs.map(async (ref) => {
            if (ref.feedUrl === null) {
              return;
            }
            try {
              const feed = await addByRssRepository.getFeedByUrl(ref.feedUrl);
              if (feed !== null) {
                deviceFeedByRefKey.set(remoteRefKey(ref), feed);
              }
            } catch {
              // An unreadable device row stays a reference and can still resolve on tap.
            }
          })
        );
        if (!isCurrent()) {
          return;
        }

        let next = toInitialRemoteEntries(refs, deviceFeedByRefKey);
        setEntries(next);
        setIsInitialLoading(false);

        const stillReferences = next.some((entry) => entry.kind === 'reference');
        if (offlineModeEnabled || accessToken === null || !stillReferences) {
          return;
        }

        const pending = next.flatMap((entry) => (entry.kind === 'reference' ? [entry.ref] : []));
        for (
          let offset = 0;
          offset < pending.length;
          offset += ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS
        ) {
          const chunk = pending.slice(offset, offset + ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS);
          try {
            const response = await requestWithMobileAuthRefresh(authContext, (api) =>
              api.reqAccountAddByRSSRemoteItemLookup(chunk.map(toAddByRSSRemoteItemLookupRef))
            );
            if (!isCurrent()) {
              return;
            }
            next = applyRemoteLookup(next, chunk, response.results);
            setEntries(next);
          } catch {
            // A failed lookup leaves the references. A tap still resolves that row.
            return;
          }
        }
      } catch {
        if (!isCurrent()) {
          return;
        }
        setErrorKey('errors.generic');
      } finally {
        if (isCurrent()) {
          refreshingRef.current = false;
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      if (generationRef.current === generation) {
        generationRef.current += 1;
      }
    };
  }, [
    accessToken,
    authContext,
    detail,
    feedIdText,
    list,
    mappedFeed,
    offlineModeEnabled,
    reloadToken,
  ]);

  const openChannel = useCallback(
    (channelIdText: string, mediumId: number | null, title: string | null) => {
      const routeKind = getChannelRouteKind(mediumId);
      if (routeKind === 'artist') {
        navigation.navigate(
          CHANNEL_BROWSE_STACK_ROUTES.ArtistDetail,
          buildArtistDetailParams({
            artistId: channelIdText,
            previewImageUrl: null,
            previewTitle: title,
          })
        );
        return;
      }
      if (routeKind === 'album') {
        navigation.navigate(
          CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
          buildAlbumDetailParams({
            albumId: channelIdText,
            previewImageUrl: null,
            previewTitle: title,
          })
        );
        return;
      }
      navigation.navigate(
        CHANNEL_BROWSE_STACK_ROUTES.PodcastDetail,
        buildPodcastDetailParams({
          podcastId: channelIdText,
          previewImageUrl: null,
          previewTitle: title,
        })
      );
    },
    [navigation]
  );

  const openItem = useCallback(
    (itemIdText: string, mediumId: number | null, title: string | null) => {
      if (getItemTypeFromMedium(mediumId) === 'track') {
        navigation.navigate(
          CHANNEL_BROWSE_STACK_ROUTES.TrackDetail,
          buildTrackDetailParams({
            previewImageUrl: null,
            previewTitle: title,
            trackId: itemIdText,
          })
        );
        return;
      }
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, { episodeId: itemIdText });
    },
    [navigation]
  );

  const openEntry = useCallback(
    (entry: AddByRssRemoteEntry) => {
      switch (entry.kind) {
        case 'add_by_rss':
          navigation.navigate('AddByRssPodcastDetail', { feedIdText: entry.feedIdText });
          return;
        case 'channel':
          openChannel(entry.channelIdText, entry.mediumId, entry.title);
          return;
        case 'item':
          openItem(entry.itemIdText, entry.mediumId, entry.title);
          return;
        case 'provider_feed':
          navigation.navigate(
            CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail,
            buildSearchResultDetailParams(entry.target)
          );
          return;
        case 'item_stub':
          navigation.navigate(
            CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail,
            buildSearchResultDetailParams(entry.stub.channel_stub)
          );
          return;
        case 'reference': {
          if (openingRef.current) {
            return;
          }
          if (offlineModeEnabled) {
            setNotice(t(OFFLINE_UNAVAILABLE_MESSAGE_KEY));
            return;
          }
          if (accessToken === null) {
            onRequestLogin();
            return;
          }

          openingRef.current = true;
          setOpeningKey(entry.key);
          setNotice(null);
          void (async () => {
            try {
              const result = await requestWithMobileAuthRefresh(authContext, (api) =>
                // Feed keys only. A source feed's username and password are never sent.
                api.reqAccountAddByRSSRemoteItemResolve(toAddByRSSRemoteItemResolveRef(entry.ref))
              );
              if (result.kind === 'channel') {
                const channelTitle = result.channel.title?.trim() ?? '';
                openChannel(
                  result.channel.id_text,
                  result.channel.medium_id,
                  channelTitle === '' ? entry.title : channelTitle
                );
                return;
              }
              if (result.kind === 'provider_feed') {
                navigation.navigate(
                  CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail,
                  buildSearchResultDetailParams(result.provider_feed)
                );
                return;
              }
              if (result.kind === 'not_found') {
                const params = remoteFeedDetailParamsForRef(entry.ref);
                if (params === null) {
                  setNotice(t('features.add_by_rss.remote_item_not_found'));
                  return;
                }
                navigation.navigate('AddByRssRemoteFeedDetail', params);
                return;
              }
              if (result.kind === 'directory_unavailable') {
                setNotice(t('features.add_by_rss.remote_item_directory_unavailable'));
                return;
              }
              const unhandled: never = result;
              return unhandled;
            } catch (error: unknown) {
              setNotice(
                handleRateLimitMessage(error, t) ??
                  t('features.add_by_rss.remote_item_lookup_failed')
              );
            } finally {
              openingRef.current = false;
              setOpeningKey(null);
            }
          })();
          return;
        }
        default: {
          const unhandled: never = entry;
          return unhandled;
        }
      }
    },
    [
      accessToken,
      authContext,
      navigation,
      offlineModeEnabled,
      onRequestLogin,
      openChannel,
      openItem,
      t,
    ]
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshingRef.current = true;
    void (async () => {
      try {
        await onRefresh();
      } finally {
        setReloadToken((token) => token + 1);
      }
    })();
  }, [onRefresh]);

  const handleRetry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const renderRow = useCallback(
    ({ index, row }: { index: number; row: AddByRssRemoteEntry }) => (
      <RemoteRow
        busy={openingKey === row.key}
        entry={row}
        index={index}
        listSlug={listSlug}
        onPress={openEntry}
        untitledLabel={untitledLabel}
      />
    ),
    [listSlug, openEntry, openingKey, untitledLabel]
  );

  const header: ReactNode =
    listHeader === null && notice === null ? null : (
      <>
        {listHeader}
        {notice !== null ? (
          <HelperNote message={notice} testID={`add-by-rss-${listSlug}-notice`} />
        ) : null}
      </>
    );

  return (
    <PodcastSectionList
      accessibilityLabel={t(labelKeyFor(list))}
      emptyMessageKey={emptyMessageKeyFor(list)}
      errorKey={errorKey}
      isInitialLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      keyExtractor={entryKey}
      listHeader={header}
      onRefresh={handleRefresh}
      onRetry={handleRetry}
      renderRow={renderRow}
      rows={entries}
      testID={`add-by-rss-${listSlug}-section`}
    />
  );
}

export const AddByRssPodrollSection = (
  props: AddByRssSectionPaneProps
): ReactElement => <AddByRssRemoteItemListSection {...props} list="podroll" />;

export const AddByRssRemoteItemsSection = (
  props: AddByRssSectionPaneProps
): ReactElement => <AddByRssRemoteItemListSection {...props} list="remote_items" />;
