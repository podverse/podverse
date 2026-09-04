import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { htmlToPlainText } from '@podverse/helpers/html';
import { formatPlaybackTime } from '@podverse/helpers/time';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useClipPlayback } from './useClipPlayback';

type ClipDetailScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, object | undefined>>;
  route: { params: { clipId: string } };
};

export function ClipDetailScreen({ navigation, route }: ClipDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { playbackNoticeKey, runBoundedClipPlay } = useClipPlayback();
  const { runQueueAction } = useHomeRowPlayback();
  const [clip, setClip] = useState<DTOClip | null>(null);
  const [item, setItem] = useState<DTOItem | null>(null);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { clipId } = route.params;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        boundedButton: {
          alignSelf: 'flex-start',
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderRadius: tokens.radii.round,
          marginTop: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        boundedButtonLabel: {
          color: themeStyles.buttonPrimary.color,
          fontSize: 14,
          fontWeight: '700',
        },
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
        },
        cardText: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
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
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const loadClip = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    try {
      const clipResponse = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqClipGet(clipId)
      );
      setClip(clipResponse);

      const itemId = clipResponse.item?.id_text ?? String(clipResponse.item_id);
      const itemResponse = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqItemGetByIdOrIdText(itemId)
      );
      setItem(itemResponse);

      if (itemResponse.channel) {
        setChannel(itemResponse.channel);
      } else {
        const channelResponse = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqChannelGetByIdOrIdText(itemResponse.channel_id)
        );
        setChannel(channelResponse);
      }
    } catch {
      setErrorKey('errors.generic');
      setClip(null);
      setItem(null);
      setChannel(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clearSession, clipId, refreshToken, setTokens]);

  useEffect(() => {
    void loadClip();
  }, [loadClip]);

  const clipDescription = useMemo(() => {
    if (clip?.description) {
      return htmlToPlainText(clip.description);
    }

    if (item?.item_description?.value) {
      return htmlToPlainText(item.item_description.value);
    }

    return '';
  }, [clip?.description, item?.item_description?.value]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="clip-detail-screen"
    >
      <Text style={styles.heading}>{clip?.title ?? t('features.clip.clip')}</Text>
      {isLoading ? <ListLoading testID="clip-detail-loading" /> : null}
      {!isLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={() => {
            void loadClip();
          }}
          testID="clip-detail-error"
        />
      ) : null}
      {!isLoading && errorKey === null && clip !== null && item !== null ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardHeading}>{clip.title ?? t('features.clip.clip')}</Text>
            <Text style={styles.cardText}>
              {item.title ?? t('media.podcast.episode')} •{' '}
              {channel?.title ?? t('media.podcast.podcast')}
            </Text>
            <Text style={styles.cardText}>
              {t('info.time.start_end', {
                timeEnd: formatPlaybackTime(clip.end_time),
                timeStart: formatPlaybackTime(clip.start_time),
              })}
            </Text>
            <Pressable
              onPress={() => {
                runBoundedClipPlay({
                  clipId: clip.id_text,
                  endTime: clip.end_time ?? null,
                  itemId: item.id_text,
                  startTime: clip.start_time,
                });
              }}
              style={styles.boundedButton}
              testID="clip-detail-bounded-play"
            >
              <Text style={styles.boundedButtonLabel}>{t('media_player.play')}</Text>
            </Pressable>
            {playbackNoticeKey !== null ? (
              <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>{t('info.summary.summary')}</Text>
            <Text style={styles.cardText}>
              {clipDescription.length > 0 ? clipDescription : t('info.summary.no_summary')}
            </Text>
          </View>

          <View style={styles.card}>
            <HomeFeedRow
              isLast
              mediaType="clips"
              onPlayPress={() => {
                runBoundedClipPlay({
                  clipId: clip.id_text,
                  endTime: clip.end_time ?? null,
                  itemId: item.id_text,
                  startTime: clip.start_time,
                });
              }}
              onPress={() => {
                navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, {
                  episodeId: item.id_text,
                });
              }}
              onQueuePress={(row, position) => {
                runQueueAction(row, 'clips', position);
              }}
              row={{
                id: clip.id_text,
                imageUrl: item.item_images[0]?.url ?? channel?.channel_images?.[0]?.url ?? null,
                subtitle: channel?.title ?? null,
                title: clip.title ?? item.title ?? clip.id_text,
              }}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
