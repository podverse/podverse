import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { formatHHMMSS } from '@podverse/helpers/time';
import type { PlaybackTarget } from '@podverse/playback-core';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { DescriptionText } from '../../components/content';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Button } from '../../components/primitives';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { clipRepository } from '../../data/repositories/clipRepository';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { navigateToMakeClipScreen } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useClipPlayback } from './useClipPlayback';

type ClipDetailScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, object | undefined>>;
  route: { params: { clipId: string } };
};

const parseSeconds = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
};

const itemFromTarget = (target: PlaybackTarget | null): DTOItem | null => {
  if (target === null || target.kind === 'add-by-rss') {
    return null;
  }
  return target.item;
};

export function ClipDetailScreen({ navigation, route }: ClipDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { account, accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { playbackNoticeKey, runBoundedClipPlay } = useClipPlayback();
  const { runQueueAction } = useHomeRowPlayback();
  const { activeTarget, loadItemPausedAt } = usePlaybackSession();
  const { handleGateError } = useMembershipGate();
  const [clip, setClip] = useState<DTOClip | null>(null);
  const [item, setItem] = useState<DTOItem | null>(null);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
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
        cardLink: {
          color: tokens.text.link,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
          textDecorationLine: 'underline',
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
        ownerActions: {
          flexDirection: 'row',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
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

  useFocusEffect(
    useCallback(() => {
      void loadClip();
      return () => undefined;
    }, [loadClip])
  );

  const clipDescriptionHtml =
    clip?.description !== undefined && clip.description !== null && clip.description.length > 0
      ? clip.description
      : (item?.item_description?.value ?? null);
  const activeItemId = itemFromTarget(activeTarget)?.id_text ?? null;
  const isOwnedClip =
    clip?.account?.id_text !== undefined &&
    account?.id_text !== undefined &&
    clip.account.id_text === account.id_text;

  const handleOpenEdit = useCallback(() => {
    if (clip === null || item === null || channel === null) {
      return;
    }

    void (async () => {
      if (activeItemId !== item.id_text) {
        await loadItemPausedAt(item, channel, parseSeconds(clip.start_time));
      }
      navigateToMakeClipScreen({ mode: 'edit', clipId: clip.id_text });
    })();
  }, [activeItemId, channel, clip, item, loadItemPausedAt]);

  const handleDelete = useCallback(() => {
    if (clip === null) {
      return;
    }

    void (async () => {
      try {
        await clipRepository.delete(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          clip.id_text
        );
        navigation.goBack();
      } catch (error) {
        if (!handleGateError(error)) {
          setErrorKey('errors.generic');
        }
      } finally {
        setShowDeleteConfirm(false);
      }
    })();
  }, [accessToken, clearSession, clip, handleGateError, navigation, refreshToken, setTokens]);

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
                timeEnd: formatHHMMSS(Number(clip.end_time)),
                timeStart: formatHHMMSS(Number(clip.start_time)),
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
            {isOwnedClip ? (
              <View style={styles.ownerActions}>
                <Button
                  label={t('features.clip.edit_clip')}
                  onPress={handleOpenEdit}
                  testID="clip-detail-edit"
                  variant="secondary"
                />
                <Button
                  label={t('features.clip.delete_clip')}
                  onPress={() => {
                    setShowDeleteConfirm(true);
                  }}
                  testID="clip-detail-delete"
                  variant="danger"
                />
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>{t('info.summary.summary')}</Text>
            <DescriptionText
              collapseLength={null}
              emptyLabel={t('info.summary.no_summary')}
              html={clipDescriptionHtml}
              linkStyle={styles.cardLink}
              resetKey={clipId}
              testID="clip-detail-description"
              textStyle={styles.cardText}
            />
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
                imageUrl: getItemPrimaryImageUrl({
                  channel: channel ?? undefined,
                  item_images: item.item_images,
                }),
                subtitle: channel?.title ?? null,
                title: clip.title ?? item.title ?? clip.id_text,
              }}
            />
          </View>
        </>
      ) : null}
      <ConfirmDialog
        body={t('features.clip.delete_clip_confirm')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="clip-detail-delete-cancel"
        confirmLabel={t('features.clip.delete_clip')}
        confirmTestID="clip-detail-delete-confirm"
        onCancel={() => {
          setShowDeleteConfirm(false);
        }}
        onConfirm={handleDelete}
        testID="clip-detail-delete-dialog"
        title={t('features.clip.delete_clip')}
        visible={showDeleteConfirm}
      />
    </ScrollView>
  );
}
