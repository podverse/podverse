import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import type { HomeStackParamList } from '../../navigation';
import { HOME_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlaybackStub } from '../home/useHomeRowPlaybackStub';

type EpisodeDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'EpisodeDetail'>;

type EpisodeTab = 'chapters' | 'clips' | 'soundbites' | 'summary' | 'transcript';

const stripHtmlToText = (value: string): string => {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatPlaybackTime = (rawValue: string | null | undefined): string => {
  if (!rawValue) {
    return '00:00';
  }

  const seconds = Math.floor(Number.parseFloat(rawValue));
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EpisodeTab>('summary');
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
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlaybackStub();

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
      }),
    [themeStyles, tokens]
  );

  const loadEpisode = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    try {
      const response = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqItemGetByIdOrIdText(episodeId)
      );
      setEpisode(response);

      if (response.channel?.title) {
        setChannelTitle(response.channel.title);
      } else {
        const channel = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqChannelGetByIdOrIdText(response.channel_id)
        );
        setChannelTitle(channel.title);
      }
    } catch {
      setErrorKey('errors.generic');
      setEpisode(null);
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

  useEffect(() => {
    if (!supportedTabs.some((tabId) => tabId === activeTab)) {
      setActiveTab('summary');
    }
  }, [activeTab, supportedTabs]);

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
                sort: 'recent',
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

  const descriptionValue = useMemo(() => {
    if (
      episode?.item_description?.value === undefined ||
      episode.item_description.value.length === 0
    ) {
      return '';
    }

    return stripHtmlToText(episode.item_description.value);
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
          onPlayPress={(row) => {
            runPlayAction(row, 'clips');
          }}
          onPress={(row) => {
            runPlayAction(row, 'clips');
          }}
          onQueuePress={(row) => {
            runQueueAction(row, 'clips');
          }}
          row={toSoundbiteRow(soundbite, index, t('info.soundbite.official_clip'))}
        />
      ));
    }

    if (activeTab === 'clips') {
      if (clipRows.length === 0) {
        return <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-clips" />;
      }

      return clipRows.map((clip) => (
        <HomeFeedRow
          key={clip.id_text}
          mediaType="clips"
          onPlayPress={(row) => {
            runPlayAction(row, 'clips');
          }}
          onPress={() => {
            navigation.navigate(HOME_STACK_ROUTES.ClipDetail, {
              clipId: clip.id_text,
            });
          }}
          onQueuePress={(row) => {
            runQueueAction(row, 'clips');
          }}
          row={toClipRow(clip)}
        />
      ));
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
                  onPlayPress={(row) => {
                    runPlayAction(row, 'episodes');
                  }}
                  onPress={(row) => {
                    runPlayAction(row, 'episodes');
                  }}
                  onQueuePress={(row) => {
                    runQueueAction(row, 'episodes');
                  }}
                  row={episodeRow}
                />
                {playbackNoticeKey !== null ? (
                  <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
                ) : null}
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

          <View style={styles.tabsRow}>
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
                  key={tabId}
                  onPress={() => {
                    setActiveTab(tabId);
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
