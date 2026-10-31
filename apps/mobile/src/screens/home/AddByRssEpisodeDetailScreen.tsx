import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlatList } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOItemChapter, TranscriptRow } from '@podverse/helpers';
import { chapterSectionHasImages } from '@podverse/helpers';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import {
  DescriptionText,
  ItemChapterRow,
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
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import { useTranscriptFollowControls } from '../../hooks/useTranscriptFollowControls';
import { useTranscriptListAutoscroll } from '../../hooks/useTranscriptListAutoscroll';
import { toAddByRssItemPlaybackResourceData } from '../../lib/addByRss/domain';
import { addByRssItemSectionUrls } from '../../lib/addByRss/itemSections';
import { addByRssPlaybackMediaId } from '../../lib/addByRss/resourceData';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { usePlayingChapterIdText } from '../../playback/usePlayingChapterIdText';
import { usePlayingTranscriptIndex } from '../../playback/usePlayingTranscriptIndex';
import { useOfflineMode } from '../../prefs/offlineMode';
import { listHeaderStackGap, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { EPISODE_TAB_LABEL_KEYS } from '../episode/episodeTabs';
import { AddByRssEpisodeHeader } from './addByRss/AddByRssEpisodeHeader';
import type { AddByRssEpisodeTab } from './addByRss/addByRssEpisodeTabs';
import { resolveAddByRssEpisodeTabs } from './addByRss/addByRssEpisodeTabs';
import type { AddByRssDetailStackParamList } from './addByRss/addByRssStackParams';
import { useAddByRssItemActions } from './addByRss/useAddByRssItemActions';
import { useAddByRssItemDetail } from './addByRss/useAddByRssItemDetail';
import { useAddByRssItemSections } from './addByRss/useAddByRssItemSections';
import { toAddByRssAboutPeople } from './addByRssHomeDetailData';
import type { QueueActionPosition } from './useHomeRowPlayback';

type AddByRssEpisodeDetailScreenProps = NativeStackScreenProps<
  AddByRssDetailStackParamList,
  'AddByRssEpisodeDetail'
>;

type AddByRssEpisodePaneRow =
  | { type: 'chapter'; id: string; chapter: DTOItemChapter }
  | { type: 'follow-bar'; id: string }
  | { type: 'transcript'; id: string; index: number; row: TranscriptRow };

const TRANSCRIPT_FOLLOW_BAR_ID = 'transcript-follow-bar';
const addByRssEpisodePaneKeyExtractor = (row: AddByRssEpisodePaneRow): string => row.id;

/**
 * The Add by RSS counterpart of `EpisodeDetailScreen`, built from the parsed feed on the device.
 *
 * Funding is not offered: a parsed item bundle carries no item funding. Clips and Official
 * Clips are not offered: clips live on the server, and soundbite playback takes catalog items.
 * Share is absent because Add by RSS pages are not shareable. Chapters and Transcript show when
 * the parsed item links them; the API fetches them once per visit, they need a signed-in
 * account, and Offline Mode shows its message until they have loaded.
 */
export function AddByRssEpisodeDetailScreen({
  navigation,
  route,
}: AddByRssEpisodeDetailScreenProps) {
  const { feedIdText } = route.params;
  const {
    errorKey,
    feed,
    isLoading,
    item: episode,
    mappedFeed,
    reload: load,
  } = useAddByRssItemDetail(route.params);
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [tab, setTab] = useState<AddByRssEpisodeTab>('summary');
  const [playbackNoticeKey, setPlaybackNoticeKey] = useState<string | null>(null);
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
        description: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        listContent: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
          paddingTop: screenBodyInsets(tokens.spacing).paddingTop,
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

  const people = useMemo(() => toAddByRssAboutPeople(episode?.itemBundle.people ?? []), [episode]);
  const sectionUrls = useMemo(
    () => (episode === null ? null : addByRssItemSectionUrls(episode.itemBundle)),
    [episode]
  );
  const tabs = useMemo(
    () =>
      resolveAddByRssEpisodeTabs({
        hasChapters: sectionUrls?.chaptersFeedUrl !== undefined,
        hasPeople: people.length > 0,
        hasTranscript: sectionUrls?.transcriptUrl !== undefined,
      }),
    [people.length, sectionUrls]
  );
  const sectionChips = useMemo(
    (): SectionChipItem<AddByRssEpisodeTab>[] =>
      tabs.map((key) => ({
        key,
        label: t(EPISODE_TAB_LABEL_KEYS[key]),
        testID: `add-by-rss-episode-detail-tab-${key}`,
      })),
    [t, tabs]
  );
  const activeTab = tabs.includes(tab) ? tab : 'summary';
  const { status } = useAuth();
  const { onRequestLogin } = useAuthPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const isSectionTab = activeTab === 'chapters' || activeTab === 'transcript';
  const {
    errorKey: sectionsErrorKey,
    retry: retrySections,
    sections,
  } = useAddByRssItemSections({
    enabled: isSectionTab && status === 'authenticated' && !offlineModeEnabled,
    feedUrl: feed?.feedUrl ?? null,
    itemBundle: episode?.itemBundle ?? null,
    itemIdText: episode?.id ?? null,
  });
  const chapterRows = useMemo(
    () => (activeTab === 'chapters' && sections !== null ? sections.chapters : []),
    [activeTab, sections]
  );
  const transcriptRows = useMemo(
    () => (activeTab === 'transcript' && sections !== null ? sections.transcriptRows : []),
    [activeTab, sections]
  );
  const listRef = useRef<FlatList<AddByRssEpisodePaneRow>>(null);
  const chapterListShowsImages = chapterSectionHasImages(chapterRows);
  const chapterItemMediaId = useMemo(() => {
    if (feed === null || mappedFeed === null || episode === null) {
      return null;
    }
    return addByRssPlaybackMediaId(
      toAddByRssItemPlaybackResourceData(feed, mappedFeed, episode.itemBundle, episode.itemIndex)
    );
  }, [episode, feed, mappedFeed]);
  const {
    autoScrollOn,
    filteredRows: filteredTranscriptRows,
    filterTerm,
    setFilterTerm,
    toggleAutoScroll,
  } = useTranscriptFollowControls({
    itemMediaId: chapterItemMediaId,
    rows: transcriptRows,
  });
  const playingTranscriptIndex = usePlayingTranscriptIndex({
    itemMediaId: chapterItemMediaId,
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
  const listRows = useMemo((): AddByRssEpisodePaneRow[] => {
    if (activeTab === 'chapters') {
      return chapterRows.map((chapter) => ({
        chapter,
        id: chapter.id_text,
        type: 'chapter' as const,
      }));
    }
    if (activeTab === 'transcript') {
      if (transcriptRows.length === 0) {
        return [];
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
    }
    return [];
  }, [activeTab, chapterRows, filteredTranscriptRows, transcriptRows.length]);
  const playingChapterIdText = usePlayingChapterIdText({
    chapters: chapterRows,
    itemMediaId: chapterItemMediaId,
  });
  const listExtraData = `${activeTab}:${sections === null ? 'none' : 'loaded'}:${
    playingChapterIdText ?? 'none'
  }:${playingTranscriptIndex}:${autoScrollOn}:${filterTerm}`;

  const actionTarget = useMemo(() => {
    if (feed === null || mappedFeed === null || episode === null) {
      return null;
    }
    return {
      feed,
      itemBundle: episode.itemBundle,
      itemIndex: episode.itemIndex,
      mappedFeed,
    };
  }, [episode, feed, mappedFeed]);

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
    if (feed === null || mappedFeed === null || episode === null) {
      return;
    }
    void playItem(feed, mappedFeed, episode.itemBundle, episode.itemIndex);
  }, [episode, feed, mappedFeed, playItem]);

  const handleChannelPress = useCallback(() => {
    navigation.navigate('AddByRssPodcastDetail', { feedIdText });
  }, [feedIdText, navigation]);

  const handleTabPress = useCallback((nextTab: AddByRssEpisodeTab) => {
    setTab(nextTab);
  }, []);

  const renderPaneRow = useCallback(
    ({ item }: { item: AddByRssEpisodePaneRow }) => {
      if (item.type === 'follow-bar') {
        return (
          <TranscriptFollowBar
            autoScrollOn={autoScrollOn}
            filterTestID="add-by-rss-episode-detail-transcript-filter"
            onChangeFilterTerm={setFilterTerm}
            onToggleAutoScroll={toggleAutoScroll}
            term={filterTerm}
            toggleTestID="add-by-rss-episode-detail-transcript-autoscroll"
          />
        );
      }
      if (item.type === 'transcript') {
        return (
          <TranscriptListRow
            body={item.row.body}
            highlighted={item.index === playingTranscriptIndex}
            speaker={item.row.speaker}
            startTimeFormatted={item.row.startTimeFormatted}
            testID={
              item.index === 0
                ? 'add-by-rss-episode-detail-tab-transcript-content'
                : `add-by-rss-episode-detail-transcript-row-${item.index}`
            }
          />
        );
      }
      return (
        <ItemChapterRow
          chapter={item.chapter}
          fallbackImageUrl={episode?.imageUrl ?? null}
          isPlaying={item.chapter.id_text === playingChapterIdText}
          showImages={chapterListShowsImages}
          testID="add-by-rss-episode-detail-chapter-row"
        />
      );
    },
    [
      autoScrollOn,
      chapterListShowsImages,
      episode,
      filterTerm,
      playingChapterIdText,
      playingTranscriptIndex,
      setFilterTerm,
      toggleAutoScroll,
    ]
  );

  const noticeKey = actionNoticeKey ?? playbackNoticeKey;
  const description = episode?.itemBundle.description ?? null;
  const descriptionHtml =
    description !== null && description.value.length > 0
      ? description.value
      : description !== null && description.preview.length > 0
        ? description.preview
        : null;
  const isReady =
    !isLoading && errorKey === null && feed !== null && mappedFeed !== null && episode !== null;

  let listFooter: ReactNode = null;
  if (isSectionTab && offlineModeEnabled && sections === null) {
    listFooter = (
      <ListEmpty
        messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
        testID="add-by-rss-episode-detail-offline-unavailable"
      />
    );
  } else if (isSectionTab && status === 'anonymous') {
    listFooter = (
      <CallToActionSection
        actionLabelKey="authentication.login"
        messageKey="authentication.login_required"
        onAction={onRequestLogin}
        testID="add-by-rss-episode-detail-auth-required"
      />
    );
  } else if (isSectionTab && sectionsErrorKey !== null) {
    listFooter = (
      <ListError
        messageKey={sectionsErrorKey}
        onRetry={retrySections}
        testID={`add-by-rss-episode-detail-tab-error-${activeTab}`}
      />
    );
  } else if (isSectionTab && sections === null) {
    listFooter = <LoadingSection testID={`add-by-rss-episode-detail-tab-loading-${activeTab}`} />;
  } else if (isSectionTab && activeTab === 'transcript' && sections !== null) {
    listFooter =
      sections.transcriptRows.length === 0 ? (
        <ListEmpty
          messageKey="info.transcript.no_transcript"
          testID="add-by-rss-episode-detail-tab-empty-transcript"
        />
      ) : null;
  } else if (isSectionTab && sections !== null) {
    listFooter =
      chapterRows.length === 0 ? (
        <ListEmpty
          messageKey="info.chapter.no_chapters"
          testID="add-by-rss-episode-detail-tab-empty-chapters"
        />
      ) : null;
  } else if (activeTab === 'people') {
    listFooter = (
      <PeoplePane
        isLoading={false}
        layout="inline"
        people={people}
        testIDPrefix="add-by-rss-episode-detail"
      />
    );
  } else if (episode !== null) {
    listFooter = (
      <View testID="add-by-rss-episode-detail-summary">
        <DescriptionText
          emptyLabel={t('info.summary.no_summary')}
          html={descriptionHtml}
          linkStyle={styles.showMore}
          resetKey={episode.id}
          showMoreStyle={styles.showMore}
          testID="add-by-rss-episode-detail-description"
          textStyle={styles.description}
          toggleTestID="add-by-rss-episode-detail-description-toggle"
          truncation={
            description?.is_truncated === true
              ? {
                  kind: 'item',
                  linkUrl: episode.itemBundle.about?.website_link_url ?? null,
                }
              : undefined
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="add-by-rss-episode-detail-screen">
      {isLoading ? <LoadingSection testID="add-by-rss-episode-detail-loading" /> : null}
      {!isLoading && errorKey !== null ? (
        <ListError messageKey={errorKey} onRetry={load} testID="add-by-rss-episode-detail-error" />
      ) : null}
      {isReady && feed !== null && mappedFeed !== null && episode !== null ? (
        <FillList
          ListEmptyComponent={null}
          ListFooterComponent={listFooter}
          ListHeaderComponent={
            <View>
              <AddByRssEpisodeHeader
                channelTitle={episode.subtitle ?? feed.feedUrl}
                episode={episode}
                feedUrl={feed.feedUrl}
                onAddToPlaylistPress={handleAddToPlaylist}
                onChannelPress={handleChannelPress}
                onMarkAsPlayedPress={handleMarkAsPlayed}
                onPlayPress={handlePlay}
                onQueuePress={handleQueue}
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
                  testID="add-by-rss-episode-detail-sections"
                />
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          data={listRows}
          extraData={listExtraData}
          keyExtractor={addByRssEpisodePaneKeyExtractor}
          onScrollToIndexFailed={
            activeTab === 'transcript' ? onTranscriptScrollToIndexFailed : undefined
          }
          onViewableItemsChanged={onTranscriptViewableItemsChanged}
          ref={listRef}
          renderItem={renderPaneRow}
          stickyHeaderIndices={
            transcriptStickyOffset > 0 ? [TRANSCRIPT_FOLLOW_BAR_STICKY_INDEX] : undefined
          }
          style={styles.list}
          testID={
            activeTab === 'chapters'
              ? 'add-by-rss-episode-detail-chapter-list'
              : activeTab === 'transcript'
                ? 'add-by-rss-episode-detail-transcript-list'
                : 'add-by-rss-episode-detail-list'
          }
          viewabilityConfig={transcriptViewabilityConfig}
        />
      ) : null}
      {addToPlaylistSheet}
    </View>
  );
}
