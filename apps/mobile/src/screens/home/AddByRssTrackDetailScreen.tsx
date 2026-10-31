import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlatList } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { TranscriptRow } from '@podverse/helpers/dto';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { ChannelHeader } from '../../components/channel';
import {
  ArtistChooserSheet,
  DescriptionText,
  PeoplePane,
  TranscriptFollowBar,
  TRANSCRIPT_FOLLOW_BAR_STICKY_INDEX,
  TranscriptListRow,
} from '../../components/content';
import type { SectionChipItem } from '../../components/form';
import { SectionChipRow } from '../../components/form';
import { FillList } from '../../components/primitives';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { useAddByRssArtistIndexVersion } from '../../hooks/useAddByRssArtistIndexVersion';
import { useAddByRssArtworkHeaders } from '../../hooks/useAddByRssArtworkHeaders';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import { useTranscriptFollowControls } from '../../hooks/useTranscriptFollowControls';
import { useTranscriptListAutoscroll } from '../../hooks/useTranscriptListAutoscroll';
import { addByRssAlbumArtists } from '../../lib/addByRss/addByRssArtistIndex';
import { toAddByRssItemPlaybackResourceData } from '../../lib/addByRss/domain';
import { addByRssItemSectionUrls } from '../../lib/addByRss/itemSections';
import { addByRssPlaybackMediaId } from '../../lib/addByRss/resourceData';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { LineArtist } from '../../lib/playback/lineArtist';
import { joinLineArtistTitles } from '../../lib/playback/lineArtist';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { buildArtistDetailParams, CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { usePlayingTranscriptIndex } from '../../playback/usePlayingTranscriptIndex';
import { useOfflineMode } from '../../prefs/offlineMode';
import { listHeaderStackGap, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { TRACK_TAB_LABEL_KEYS } from '../track/trackTabs';
import type { AddByRssDetailStackParamList } from './addByRss/addByRssStackParams';
import { AddByRssTrackHeader } from './addByRss/AddByRssTrackHeader';
import type { AddByRssTrackTab } from './addByRss/addByRssTrackTabs';
import { resolveAddByRssTrackTabs } from './addByRss/addByRssTrackTabs';
import { useAddByRssItemActions } from './addByRss/useAddByRssItemActions';
import { useAddByRssItemDetail } from './addByRss/useAddByRssItemDetail';
import { useAddByRssItemSections } from './addByRss/useAddByRssItemSections';
import { addByRssFeedHeaderArtwork, toAddByRssAboutPeople } from './addByRssHomeDetailData';
import type { QueueActionPosition } from './useHomeRowPlayback';

type AddByRssTrackDetailScreenProps = NativeStackScreenProps<
  AddByRssDetailStackParamList & ChannelBrowseStackParamList,
  'AddByRssTrackDetail'
>;

type AddByRssTrackPaneRow =
  | { id: string; type: 'follow-bar' }
  | { id: string; index: number; row: TranscriptRow; type: 'transcript' };

const EMPTY_ADD_BY_RSS_TRACK_ROWS: AddByRssTrackPaneRow[] = [];
const TRANSCRIPT_FOLLOW_BAR_ID = 'transcript-follow-bar';
const addByRssTrackPaneKeyExtractor = (row: AddByRssTrackPaneRow): string => row.id;

/**
 * The Add by RSS counterpart of `TrackDetailScreen`, built from the parsed feed on the device.
 *
 * Funding is not offered: a parsed item bundle carries no item funding. Share is absent
 * because Add by RSS pages are not shareable. Lyrics shows when the parsed item links a
 * transcript. The API fetches it once per visit, it needs a signed-in account, and Offline
 * Mode shows its message until it has loaded.
 */
export function AddByRssTrackDetailScreen({ navigation, route }: AddByRssTrackDetailScreenProps) {
  const {
    errorKey,
    feed,
    isLoading,
    item: track,
    mappedFeed,
    reload,
  } = useAddByRssItemDetail(route.params);
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [tab, setTab] = useState<AddByRssTrackTab>('summary');
  const [playbackNoticeKey, setPlaybackNoticeKey] = useState<string | null>(null);
  const listRef = useRef<FlatList<AddByRssTrackPaneRow>>(null);
  const routeKey = `${route.params.feedIdText}\n${route.params.itemKey}`;
  const [loadedKey, setLoadedKey] = useState(routeKey);
  if (loadedKey !== routeKey) {
    setLoadedKey(routeKey);
    setTab('summary');
    setPlaybackNoticeKey(null);
  }
  const { playItem } = useAddByRssPlayback({ onNotice: setPlaybackNoticeKey });
  const { actionNoticeKey, addToPlaylist, addToPlaylistSheet, markAsPlayed, queue } =
    useAddByRssItemActions();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chipRow: {
          marginTop: listHeaderStackGap(tokens.spacing),
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
          paddingTop: screenBodyInsets(tokens.spacing).paddingTop,
        },
        description: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        notice: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.sm,
        },
        showMore: {
          ...typography.caption,
          color: tokens.text.link,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const albumTitle =
    feed === null ? '' : (mappedFeed?.channel.channel.title ?? feed.title ?? feed.feedUrl);
  const headerArtwork = useMemo(
    () =>
      feed === null
        ? { listUrl: null, viewerUrl: null }
        : addByRssFeedHeaderArtwork(feed, mappedFeed),
    [feed, mappedFeed]
  );
  const headerArtworkHeaders = useAddByRssArtworkHeaders(
    feed?.feedUrl ?? null,
    headerArtwork.listUrl
  );
  const people = useMemo(() => toAddByRssAboutPeople(track?.itemBundle.people ?? []), [track]);
  const sectionUrls = useMemo(
    () => (track === null ? null : addByRssItemSectionUrls(track.itemBundle)),
    [track]
  );
  const tabs = useMemo(
    () =>
      resolveAddByRssTrackTabs({
        hasPeople: people.length > 0,
        hasTranscript: sectionUrls?.transcriptUrl !== undefined,
      }),
    [people.length, sectionUrls]
  );
  const sectionChips = useMemo(
    (): SectionChipItem<AddByRssTrackTab>[] =>
      tabs.map((key) => ({
        key,
        label: t(TRACK_TAB_LABEL_KEYS[key]),
        testID: `add-by-rss-track-detail-tab-${key}`,
      })),
    [t, tabs]
  );
  const activeTab: AddByRssTrackTab = tabs.includes(tab) ? tab : 'summary';
  const { status } = useAuth();
  const { onRequestLogin } = useAuthPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const {
    errorKey: lyricsErrorKey,
    retry: retryLyrics,
    sections,
  } = useAddByRssItemSections({
    enabled: activeTab === 'transcript' && status === 'authenticated' && !offlineModeEnabled,
    feedUrl: feed?.feedUrl ?? null,
    itemBundle: track?.itemBundle ?? null,
    itemIdText: track?.id ?? null,
  });

  const transcriptRows = sections?.transcriptRows ?? [];
  const itemMediaId = useMemo(() => {
    if (feed === null || mappedFeed === null || track === null) {
      return null;
    }
    return addByRssPlaybackMediaId(
      toAddByRssItemPlaybackResourceData(feed, mappedFeed, track.itemBundle, track.itemIndex)
    );
  }, [feed, mappedFeed, track]);
  const {
    autoScrollOn,
    filteredRows: filteredTranscriptRows,
    filterTerm,
    setFilterTerm,
    toggleAutoScroll,
  } = useTranscriptFollowControls({
    itemMediaId,
    rows: transcriptRows,
  });
  const playingTranscriptIndex = usePlayingTranscriptIndex({
    itemMediaId,
    rows: filteredTranscriptRows,
  });
  const transcriptStickyOffset = activeTab === 'transcript' && transcriptRows.length > 0 ? 1 : 0;
  const {
    onScrollToIndexFailed: onTranscriptScrollToIndexFailed,
    onViewableItemsChanged: onTranscriptViewableItemsChanged,
    viewabilityConfig: transcriptViewabilityConfig,
  } = useTranscriptListAutoscroll({
    activeIndex: playingTranscriptIndex,
    autoScrollOn: autoScrollOn && activeTab === 'transcript',
    dataIndexOffset: transcriptStickyOffset,
    listRef,
  });

  const listRows = useMemo((): AddByRssTrackPaneRow[] => {
    if (activeTab !== 'transcript' || sections === null || transcriptRows.length === 0) {
      return EMPTY_ADD_BY_RSS_TRACK_ROWS;
    }
    return [
      { id: TRANSCRIPT_FOLLOW_BAR_ID, type: 'follow-bar' as const },
      ...filteredTranscriptRows.map((row, index) => ({
        id: `transcript-${index}`,
        index,
        row,
        type: 'transcript' as const,
      })),
    ];
  }, [activeTab, filteredTranscriptRows, sections, transcriptRows.length]);

  const renderPaneRow = useCallback(
    ({ item }: { item: AddByRssTrackPaneRow }) => {
      if (item.type === 'follow-bar') {
        return (
          <TranscriptFollowBar
            autoScrollOn={autoScrollOn}
            filterTestID="add-by-rss-track-detail-transcript-filter"
            onChangeFilterTerm={setFilterTerm}
            onToggleAutoScroll={toggleAutoScroll}
            term={filterTerm}
            toggleTestID="add-by-rss-track-detail-transcript-autoscroll"
          />
        );
      }
      return (
        <TranscriptListRow
          body={item.row.body}
          highlighted={item.index === playingTranscriptIndex}
          speaker={item.row.speaker}
          startTimeFormatted={item.row.startTimeFormatted}
          testID={
            item.index === 0
              ? 'add-by-rss-track-detail-tab-transcript-content'
              : `add-by-rss-track-detail-transcript-row-${item.index}`
          }
        />
      );
    },
    [autoScrollOn, filterTerm, playingTranscriptIndex, setFilterTerm, toggleAutoScroll]
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [activeTab]);

  const actionTarget = useMemo(() => {
    if (feed === null || mappedFeed === null || track === null) {
      return null;
    }
    return {
      feed,
      itemBundle: track.itemBundle,
      itemIndex: track.itemIndex,
      mappedFeed,
    };
  }, [feed, mappedFeed, track]);

  const handleQueue = useCallback(
    (position: QueueActionPosition) => {
      if (actionTarget === null) {
        return;
      }
      queue(actionTarget, position);
    },
    [actionTarget, queue]
  );

  const handleAddToPlaylist = useCallback(() => {
    if (actionTarget === null) {
      return;
    }
    addToPlaylist(actionTarget);
  }, [actionTarget, addToPlaylist]);

  const handleMarkAsPlayed = useCallback(() => {
    if (actionTarget === null) {
      return;
    }
    markAsPlayed(actionTarget);
  }, [actionTarget, markAsPlayed]);

  const handlePlay = useCallback(() => {
    if (feed === null || mappedFeed === null || track === null) {
      return;
    }
    void playItem(feed, mappedFeed, track.itemBundle, track.itemIndex);
  }, [feed, mappedFeed, playItem, track]);

  const openFeed = useCallback(() => {
    navigation.navigate('AddByRssPodcastDetail', { feedIdText: route.params.feedIdText });
  }, [navigation, route.params.feedIdText]);

  const artistIndexVersion = useAddByRssArtistIndexVersion();
  const albumArtists = useMemo(
    () => (feed === null ? [] : addByRssAlbumArtists(feed.feedUrl)),
    [artistIndexVersion, feed]
  );
  const artistByline = joinLineArtistTitles(albumArtists);
  const [isArtistChooserOpen, setIsArtistChooserOpen] = useState(false);

  const openArtist = useCallback(
    (artist: LineArtist) => {
      if (artist.kind === 'add-by-rss') {
        navigation.navigate('AddByRssPodcastDetail', { feedIdText: artist.feedIdText });
        return;
      }
      navigation.navigate(
        CHANNEL_BROWSE_STACK_ROUTES.ArtistDetail,
        buildArtistDetailParams({
          artistId: artist.publisher.id_text,
          previewTitle: artist.publisher.title,
        })
      );
    },
    [navigation]
  );

  const onArtistBylinePress = useCallback(() => {
    const [only] = albumArtists;
    if (albumArtists.length === 1 && only !== undefined) {
      openArtist(only);
      return;
    }
    if (albumArtists.length > 1) {
      setIsArtistChooserOpen(true);
    }
  }, [albumArtists, openArtist]);

  const handleTabPress = useCallback((nextTab: AddByRssTrackTab) => {
    setTab(nextTab);
  }, []);

  const noticeKey = actionNoticeKey ?? playbackNoticeKey;
  const description = track?.itemBundle.description ?? null;
  const descriptionHtml =
    description !== null && description.value.length > 0
      ? description.value
      : description !== null && description.preview.length > 0
        ? description.preview
        : null;
  const isReady =
    !isLoading && errorKey === null && feed !== null && mappedFeed !== null && track !== null;

  let listFooter: ReactNode = null;
  if (activeTab === 'transcript' && offlineModeEnabled && sections === null) {
    listFooter = (
      <ListEmpty
        messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
        testID="add-by-rss-track-detail-offline-unavailable"
      />
    );
  } else if (activeTab === 'transcript' && status === 'anonymous') {
    listFooter = (
      <CallToActionSection
        actionLabelKey="authentication.login"
        messageKey="authentication.login_required"
        onAction={onRequestLogin}
        testID="add-by-rss-track-detail-auth-required"
      />
    );
  } else if (activeTab === 'transcript' && lyricsErrorKey !== null) {
    listFooter = (
      <ListError
        messageKey={lyricsErrorKey}
        onRetry={retryLyrics}
        testID="add-by-rss-track-detail-tab-error-transcript"
      />
    );
  } else if (activeTab === 'transcript' && sections === null) {
    listFooter = <LoadingSection testID="add-by-rss-track-detail-tab-loading-transcript" />;
  } else if (activeTab === 'transcript' && sections !== null) {
    listFooter =
      sections.transcriptRows.length === 0 ? (
        <ListEmpty
          messageKey="info.transcript.no_transcript"
          testID="add-by-rss-track-detail-tab-empty-transcript"
        />
      ) : null;
  } else if (activeTab === 'people') {
    listFooter = (
      <PeoplePane
        isLoading={false}
        layout="inline"
        people={people}
        testIDPrefix="add-by-rss-track-detail"
      />
    );
  } else if (track !== null) {
    listFooter = (
      <View testID="add-by-rss-track-detail-summary">
        <DescriptionText
          emptyLabel={t('info.summary.no_summary')}
          html={descriptionHtml}
          linkStyle={styles.showMore}
          resetKey={track.id}
          showMoreStyle={styles.showMore}
          testID="add-by-rss-track-detail-description"
          textStyle={styles.description}
          toggleTestID="add-by-rss-track-detail-description-toggle"
          truncation={
            description?.is_truncated === true
              ? {
                  kind: 'item',
                  linkUrl: track.itemBundle.about?.website_link_url ?? null,
                }
              : undefined
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="add-by-rss-track-detail-screen">
      {isLoading ? <LoadingSection testID="add-by-rss-track-detail-loading" /> : null}
      {!isLoading && errorKey !== null ? (
        <ListError messageKey={errorKey} onRetry={reload} testID="add-by-rss-track-detail-error" />
      ) : null}
      {isReady && feed !== null && mappedFeed !== null && track !== null ? (
        <FillList
          ListEmptyComponent={null}
          ListFooterComponent={listFooter}
          ListHeaderComponent={
            <View>
              <ChannelHeader
                artworkAddByRssFeedUrl={feed.feedUrl}
                artworkHeaders={headerArtworkHeaders}
                artworkUri={headerArtwork.listUrl}
                onTitlePress={openFeed}
                subtitle={
                  artistByline.length > 0
                    ? artistByline
                    : (mappedFeed.channel.about?.author ?? null)
                }
                subtitleLink={
                  artistByline.length > 0
                    ? {
                        accessibilityLabel: t('media_player.open_named_screen', {
                          name: artistByline,
                          screen: t(
                            albumArtists.length > 1 ? 'media.music.artists' : 'media.music.artist'
                          ),
                        }),
                        onPress: onArtistBylinePress,
                        testID: 'add-by-rss-track-detail-artist-link',
                      }
                    : undefined
                }
                testID="add-by-rss-track-detail-album-header"
                title={albumTitle}
              />
              <AddByRssTrackHeader
                albumTitle={albumTitle}
                feedUrl={feed.feedUrl}
                onAddToPlaylistPress={handleAddToPlaylist}
                onAlbumPress={openFeed}
                onMarkAsPlayedPress={handleMarkAsPlayed}
                onPlayPress={handlePlay}
                onQueuePress={handleQueue}
                track={track}
              />
              {noticeKey !== null ? (
                <Text accessibilityLiveRegion="polite" style={styles.notice}>
                  {t(noticeKey)}
                </Text>
              ) : null}
              <View style={styles.chipRow}>
                <SectionChipRow
                  items={sectionChips}
                  onSelect={handleTabPress}
                  selectedKey={activeTab}
                  testID="add-by-rss-track-detail-sections"
                />
              </View>
            </View>
          }
          contentContainerStyle={styles.content}
          data={listRows}
          extraData={`${activeTab}:${sections === null ? 'none' : 'loaded'}:${playingTranscriptIndex}:${autoScrollOn}:${filterTerm}`}
          keyExtractor={addByRssTrackPaneKeyExtractor}
          onScrollToIndexFailed={
            activeTab === 'transcript' ? onTranscriptScrollToIndexFailed : undefined
          }
          onViewableItemsChanged={onTranscriptViewableItemsChanged}
          ref={listRef}
          renderItem={renderPaneRow}
          stickyHeaderIndices={
            transcriptStickyOffset > 0 ? [TRANSCRIPT_FOLLOW_BAR_STICKY_INDEX] : undefined
          }
          testID={
            activeTab === 'transcript'
              ? 'add-by-rss-track-detail-transcript-list'
              : 'add-by-rss-track-detail-list'
          }
          viewabilityConfig={transcriptViewabilityConfig}
        />
      ) : null}
      {addToPlaylistSheet}
      <ArtistChooserSheet
        artists={albumArtists}
        onCancel={() => {
          setIsArtistChooserOpen(false);
        }}
        onSelect={(artist) => {
          setIsArtistChooserOpen(false);
          openArtist(artist);
        }}
        testID="add-by-rss-track-detail-artist-chooser"
        visible={isArtistChooserOpen}
      />
    </View>
  );
}
