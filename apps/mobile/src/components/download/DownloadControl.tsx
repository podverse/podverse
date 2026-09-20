import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';

import { useActionError } from '../../feedback/ActionErrorProvider';
import { useDownloadAction } from '../../downloads/useDownloads';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';

type DownloadControlProps = {
  item: DTOItem;
};

/**
 * Episode download affordance. **Renders nothing** when the item is not downloadable (livestream,
 * HLS/m3u8, or no enclosure) — mirroring web, where livestream UI never offers Download. Otherwise
 * shows Download → queued/downloading progress (with Cancel) → Downloaded (with Remove), and
 * surfaces failures with a retry. All state comes from `useDownloadAction`.
 *
 * This is a single-item surface, so it opts into byte progress and shows a percentage. List rows
 * deliberately do not — see `DownloadRowControl`.
 */
export function DownloadControl({ item }: DownloadControlProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget, enclosureSelectedParams } = usePlaybackSession();
  const activeItemId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const explicitSelectedParams =
    activeItemId === item.id_text ? enclosureSelectedParams : undefined;
  const { errorReason, isDownloadable, noticeKey, percentComplete, remove, start, status } =
    useDownloadAction(item, true, { explicitSelectedParams });
  const { openDownloadError } = useActionError();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignSelf: 'flex-start',
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderRadius: tokens.radii.round,
          marginTop: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        buttonLabel: {
          color: themeStyles.buttonPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        progressRow: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: tokens.spacing.md,
        },
        secondaryButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        secondaryButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        statusLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  if (!isDownloadable) {
    return null;
  }

  if (status === 'queued' || status === 'downloading' || status === 'paused') {
    const statusLabel =
      status === 'queued'
        ? t('features.download.queued')
        : status === 'paused'
          ? t('features.download.paused')
          : percentComplete === null
            ? t('features.download.downloading_episode')
            : `${t('features.download.downloading_episode')} · ${percentComplete}%`;

    return (
      <View>
        <View style={styles.progressRow} testID="episode-download-progress">
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={remove}
            style={styles.secondaryButton}
            testID="episode-download-cancel"
          >
            <Text style={styles.secondaryButtonLabel}>{t('misc.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (status === 'complete') {
    return (
      <View style={styles.progressRow} testID="episode-download-complete">
        <Text style={styles.statusLabel}>{t('features.download.episode_downloaded')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={remove}
          style={styles.secondaryButton}
          testID="episode-download-remove"
        >
          <Text style={styles.secondaryButtonLabel}>{t('features.download.remove')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (status === 'failed') {
            openDownloadError(errorReason, start);
            return;
          }
          start();
        }}
        style={styles.button}
        testID="episode-download-button"
      >
        <Text style={styles.buttonLabel}>{t('features.download.download_episode')}</Text>
      </Pressable>
      {status === 'failed' ? (
        <Pressable
          accessibilityLabel={t('action_error.download_a11y')}
          accessibilityRole="button"
          onPress={() => {
            openDownloadError(errorReason, start);
          }}
          testID="episode-download-error"
        >
          <Text style={styles.notice}>{t('features.download.episode_download_error')}</Text>
        </Pressable>
      ) : null}
      {noticeKey !== null ? (
        <Text style={styles.notice} testID="episode-download-notice">
          {t(noticeKey)}
        </Text>
      ) : null}
    </View>
  );
}
