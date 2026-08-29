import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import { htmlToPlainText } from '@podverse/helpers/html';
import { formatPlaybackTime } from '@podverse/helpers/time';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { DownloadControl } from '../../components/download/DownloadControl';
import type { OptionListItem } from '../../components/form/OptionListGroup';
import { SortSelectRow } from '../../components/form/SortSelectRow';
import { Button } from '../../components/primitives/Button';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { usePlayback } from '../../playback/PlaybackProvider';
import type { EpisodeClipSort, EpisodeTab } from '../../prefs/detailListPrefs';
import {
  DEFAULT_EPISODE_CLIP_SORT,
  DEFAULT_EPISODE_TAB,
  EPISODE_CLIP_SORT_OPTIONS,
  readEpisodeDetailPrefs,
  writeEpisodeDetailClipSort,
  writeEpisodeDetailTab,
} from '../../prefs/detailListPrefs';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type EpisodeDetailScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  'EpisodeDetail'
>;

const CLIP_SORT_LABEL_KEYS: Record<EpisodeClipSort, string> = {
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
};

const toClipRow = (clip: DTOClip): HomeFeedRowData => {
  const imageUrl =
    clip.item.item_images[0]?.url ?? clip.item.channel?.channel_images?.[0]?.url ?? null;
  return {
    id: clip.id_text,
    imageUrl,
    subtitle: clip.item.channel?.title ?? null,
    title: clip.title ?? clip.item.title ?? clip.id_text,
  };
};

const toSoundbiteRow = (
  soundbite: DTOItemSoundbite,
  index: number,
  fallbackTitle: string
): HomeFeedRowData => {
  const imageUrl =
    soundbite.item?.item_images[0]?.url ??
    soundbite.item?.channel?.channel_images?.[0]?.url ??
    null;
  return {
    id: soundbite.id_text,
    imageUrl,
    subtitle: formatPlaybackTime(soundbite.start_time),
    title: soundbite.title ?? `${fallbackTitle} ${index + 1}`,
  };
};

export function EpisodeDetailScreen({ navigation, route }: EpisodeDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { episodeId } = route.params;
  const [episode, setEpisode] = useState<DTOItem | null>(null);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EpisodeTab>(DEFAULT_EPISODE_TAB);
  const [clipSort, setClipSort] = useState<EpisodeClipSort>(DEFAULT_EPISODE_CLIP_SORT);
  const [isTabLoading, setIsTabLoading] = useState<boolean>(false);
  const [tabErrorKey, setTabErrorKey] = useState<string | null>(null);
  const [chapterRows, setChapterRows] = useState<DTOItemChapter[]>([]);
  const [soundbiteRows, setSoundbiteRows] = useState<DTOItemSoundbite[]>([]);
  const [clipRows, setClipRows] = useState<DTOClip[]>([]);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [loadedTabs, setLoadedTabs] = useState<Record<EpisodeTab, boolean>>({
    chapters: false,
    clips: false,
    soundbites: false,
    summary: true,
    transcript: false,
  });
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { playItem, playSoundbite } = usePlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        cardHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        label: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.xs,
        },
        metadataValue: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginBottom: tokens.spacing.sm,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        tab: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        tabActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        tabLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        tabLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
        tabsRow: {
          flexDirection: 'row',
          marginTop: tokens.spacing.md,
        },
        titleActions: {
          flexDirection: 'row',
          marginBottom: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  /**
   * The stored copy is the whole item as the feed delivered it, so an episode from a subscribed
   * channel opens and plays with no connection. Episodes reached from search or a channel the
   * device does not follow have nothing stored and are fetched.
   */
  const loadEpisode = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    try {
      const response =
        (await channelItemsRepository.getByIdText(episodeId)) ??
        (await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqItemGetByIdOrIdText(episodeId)
        ));
      setEpisode(response);

      if (response.channel) {
        setChannel(response.channel);
        setChannelTitle(response.channel.title);
      } else {
        const channelResponse = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqChannelGetByIdOrIdText(response.channel_id)
        );
        setChannel(channelResponse);
        setChannelTitle(channelResponse.title);
      }
    } catch {
      setErrorKey('errors.generic');
      setEpisode(null);
      setChannel(null);
      setChannelTitle(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clearSession, episodeId, refreshToken, setTokens]);

  useEffect(() => {
    void loadEpisode();
  }, [loadEpisode]);

  const supportedTabs = useMemo(() => {
    if (episode === null) {
      return ['summary'] as EpisodeTab[];
    }

    const tabs: EpisodeTab[] = ['summary', 'clips'];
    if (episode.item_chapters_feed !== null && episode.item_chapters_feed !== undefined) {
      tabs.push('chapters');
    }
    if (episode.item_soundbites.length > 0) {
      tabs.push('soundbites');
    }
    if (episode.item_transcripts.length > 0) {
      tabs.push('transcript');
    }

    return tabs;
  }, [episode]);

  /**
   * A remembered tab still has to exist on this episode — one with no transcript cannot open on
   * one. The stored preference is left alone, so the tab comes back if the episode later gains it.
   *
   * Held until the episode has loaded, because until then every tab looks unsupported and a
   * restored choice would be thrown away before the screen could honour it.
   */
  useEffect(() => {
    if (episode === null) {
      return;
    }
    if (!supportedTabs.some((tabId) => tabId === activeTab)) {
      setActiveTab(DEFAULT_EPISODE_TAB);
    }
  }, [activeTab, episode, supportedTabs]);

  /**
   * Restored before any tab request goes out: the tab decides which one the screen makes, so
   * applying it afterwards would mean fetching Summary's pane and then immediately fetching
   * another.
   */
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const stored = await readEpisodeDetailPrefs(episodeId);
      if (!isMounted) {
        return;
      }
      setActiveTab(stored.tab);
      setClipSort(stored.clipSort);
    })();

    return () => {
      isMounted = false;
    };
  }, [episodeId]);

  const loadTab = useCallback(
    async (tab: EpisodeTab) => {
      if (tab === 'summary' || loadedTabs[tab]) {
        return;
      }

      setIsTabLoading(true);
      setTabErrorKey(null);
      try {
        if (tab === 'chapters') {
          const response = await requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) => api.reqItemParseAndGetChapters(episodeId)
          );
          setChapterRows(response.data.filter((chapter) => chapter.table_of_contents !== false));
        } else if (tab === 'soundbites') {
          const response = await requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqItemSoundbiteGetManyByItemIdText(episodeId, {
                page: 1,
                sort: 'recent',
              })
          );
          setSoundbiteRows(response.data);
        } else if (tab === 'clips') {
          // The order is decided by the endpoint, so the remembered sort is read before the
          // request rather than applied to what comes back.
          const { clipSort: storedClipSort } = await readEpisodeDetailPrefs(episodeId);
          const response = await requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqClipGetManyByItemPublic({
                idOrIdText: episodeId,
                page: 1,
                range: null,
                sort: storedClipSort,
              })
          );
          setClipRows(response.data);
        } else if (tab === 'transcript') {
          const response = await requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) => api.reqItemTranscriptGet(episodeId)
          );
          setTranscriptText(response.data ?? '');
        }

        setLoadedTabs((previous) => ({
          ...previous,
          [tab]: true,
        }));
      } catch {
        setTabErrorKey('errors.generic');
      } finally {
        setIsTabLoading(false);
      }
    },
    [accessToken, clearSession, episodeId, loadedTabs, refreshToken, setTokens]
  );

  useEffect(() => {
    if (activeTab === 'summary') {
      return;
    }

    void loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleTabPress = useCallback(
    (tab: EpisodeTab) => {
      setActiveTab(tab);
      void writeEpisodeDetailTab(episodeId, tab);
    },
    [episodeId]
  );

  /**
   * Marking the tab unloaded is what triggers the refetch: the tab loader skips a pane it has
   * already fetched, so clearing the flag is how a new order gets asked for without a second code
   * path that fetches clips.
   */
  const handleClipSortSelect = useCallback(
    (sort: EpisodeClipSort) => {
      setClipSort(sort);
      void (async () => {
        await writeEpisodeDetailClipSort(episodeId, sort);
        setLoadedTabs((previous) => ({ ...previous, clips: false }));
      })();
    },
    [episodeId]
  );

  const clipSortOptions = useMemo<OptionListItem<EpisodeClipSort>[]>(() => {
    return EPISODE_CLIP_SORT_OPTIONS.map((option) => ({
      label: t(CLIP_SORT_LABEL_KEYS[option]),
      testID: `episode-detail-clip-sort-${option}`,
      value: option,
    }));
  }, [t]);

  const descriptionValue = useMemo(() => {
    if (
      episode?.item_description?.value === undefined ||
      episode.item_description.value.length === 0
    ) {
      return '';
    }

    return htmlToPlainText(episode.item_description.value);
  }, [episode]);

  const displayDescription = useMemo(() => {
    if (descriptionExpanded || descriptionValue.length <= 360) {
      return descriptionValue;
    }

    return `${descriptionValue.slice(0, 360)}…`;
  }, [descriptionExpanded, descriptionValue]);

  const episodeRow = useMemo((): HomeFeedRowData | null => {
    if (episode === null) {
      return null;
    }

    return {
      id: episode.id_text,
      imageUrl: episode.item_images[0]?.url ?? episode.channel?.channel_images?.[0]?.url ?? null,
      subtitle: channelTitle,
      title: episode.title ?? episode.id_text,
    };
  }, [channelTitle, episode]);

  const renderTabContent = () => {
    if (isTabLoading) {
      return <ListLoading testID={`episode-detail-tab-loading-${activeTab}`} />;
    }

    if (tabErrorKey !== null) {
      return (
        <ListError
          messageKey={tabErrorKey}
          onRetry={() => {
            void loadTab(activeTab);
          }}
          testID={`episode-detail-tab-error-${activeTab}`}
        />
      );
    }

    if (activeTab === 'summary') {
      return null;
    }

    if (activeTab === 'chapters') {
      if (chapterRows.length === 0) {
        return <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-chapters" />;
      }

      return chapterRows.map((chapter) => (
        <View key={chapter.id_text} style={styles.card}>
          <Text style={styles.label}>{t('info.chapter.chapter')}</Text>
          <Text style={styles.metadataValue}>{chapter.title ?? chapter.id_text}</Text>
          <Text style={styles.notice}>
            {t('info.time.start_end', {
              timeEnd: formatPlaybackTime(chapter.end_time),
              timeStart: formatPlaybackTime(chapter.start_time),
            })}
          </Text>
        </View>
      ));
    }

    if (activeTab === 'soundbites') {
      if (soundbiteRows.length === 0) {
        return <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-soundbites" />;
      }

      return soundbiteRows.map((soundbite, index) => (
        <HomeFeedRow
          key={soundbite.id_text}
          mediaType="clips"
          onPlayPress={() => {
            if (episode !== null && channel !== null) {
              void playSoundbite(soundbite, episode, channel);
            }
          }}
          onPress={() => {
            if (episode !== null && channel !== null) {
              void playSoundbite(soundbite, episode, channel);
            }
          }}
          onQueuePress={(row, position) => {
            runQueueAction(row, 'clips', position);
          }}
          row={toSoundbiteRow(soundbite, index, t('info.soundbite.official_clip'))}
        />
      ));
    }

    if (activeTab === 'clips') {
      return (
        <>
          <SortSelectRow
            heading={t('filters.screen.sort_heading')}
            onSelect={handleClipSortSelect}
            options={clipSortOptions}
            testID="episode-detail-clip-sort"
            value={clipSort}
          />
          {clipRows.length === 0 ? (
            <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-clips" />
          ) : (
            clipRows.map((clip) => (
              <HomeFeedRow
                key={clip.id_text}
                mediaType="clips"
                onPlayPress={(row) => {
                  runPlayAction(row, 'clips');
                }}
                onPress={() => {
                  navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.ClipDetail, {
                    clipId: clip.id_text,
                  });
                }}
                onQueuePress={(row, position) => {
                  runQueueAction(row, 'clips', position);
                }}
                row={toClipRow(clip)}
              />
            ))
          )}
        </>
      );
    }

    if (transcriptText.length === 0) {
      return <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-transcript" />;
    }

    return (
      <View style={styles.card} testID="episode-detail-tab-transcript-content">
        <Text style={styles.metadataValue}>{transcriptText}</Text>
      </View>
    );
  };

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('episode', episodeId));
  }, [episodeId]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="episode-detail-screen"
    >
      {isLoading ? <ListLoading testID="episode-detail-loading" /> : null}
      {!isLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={() => {
            void loadEpisode();
          }}
          testID="episode-detail-error"
        />
      ) : null}

      {!isLoading && errorKey === null && episode !== null ? (
        <>
          <Text style={styles.heading}>{episode.title ?? t('media.podcast.episode')}</Text>
          <View style={styles.titleActions}>
            <Button
              label={t('features.share')}
              onPress={handleShare}
              testID="episode-detail-share"
              variant="secondary"
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t('media.podcast.podcast')}</Text>
            <Text style={styles.metadataValue}>{channelTitle ?? t('media.podcast.podcast')}</Text>
            {episode.pub_date ? (
              <Text style={styles.notice}>
                {t('media.updated_with_date', {
                  date: new Date(episode.pub_date).toLocaleDateString(i18n.language),
                })}
              </Text>
            ) : null}
            <Text style={styles.notice}>
              {t('info.time.last', {
                timePosition: formatPlaybackTime(episode.item_about.duration),
              })}
            </Text>
            {episodeRow !== null ? (
              <>
                <HomeFeedRow
                  mediaType="episodes"
                  onPlayPress={() => {
                    if (episode !== null && channel !== null) {
                      void playItem(episode, channel);
                    }
                  }}
                  onPress={() => {
                    if (episode !== null && channel !== null) {
                      void playItem(episode, channel);
                    }
                  }}
                  onQueuePress={(row, position) => {
                    runQueueAction(row, 'episodes', position);
                  }}
                  row={episodeRow}
                />
                {playbackNoticeKey !== null ? (
                  <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
                ) : null}
                <DownloadControl item={episode} />
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>{t('info.summary.summary')}</Text>
            <Text style={styles.metadataValue} testID="episode-detail-description">
              {displayDescription.length > 0 ? displayDescription : t('info.summary.no_summary')}
            </Text>
            {descriptionValue.length > 360 ? (
              <Pressable
                onPress={() => {
                  setDescriptionExpanded((current) => !current);
                }}
                testID="episode-detail-description-toggle"
              >
                <Text style={styles.notice}>{t('info.show_more')}</Text>
              </Pressable>
            ) : null}
          </View>

          <View accessibilityRole="tablist" style={styles.tabsRow}>
            {supportedTabs.map((tabId) => {
              const labelKey =
                tabId === 'summary'
                  ? 'info.summary.summary'
                  : tabId === 'chapters'
                    ? 'info.chapter.chapters'
                    : tabId === 'soundbites'
                      ? 'info.soundbite.official_clips'
                      : tabId === 'clips'
                        ? 'features.clip.clips'
                        : 'info.transcript.transcript';
              const isActive = tabId === activeTab;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  key={tabId}
                  onPress={() => {
                    handleTabPress(tabId);
                  }}
                  style={[styles.tab, isActive ? styles.tabActive : null]}
                  testID={`episode-detail-tab-${tabId}`}
                >
                  <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {renderTabContent()}
        </>
      ) : null}
    </ScrollView>
  );
}
