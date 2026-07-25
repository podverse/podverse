import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';

import { isItemDownloadable } from '../../downloads/downloadEligibility';
import { downloadManager } from '../../downloads/downloadManager';
import { useItemDownload } from '../../downloads/useDownloads';
import { useTheme } from '../../theme/useTheme';

type DownloadControlProps = {
  item: DTOItem;
};

/**
 * Episode download affordance. **Renders nothing** when the item is not downloadable (livestream,
 * HLS/m3u8, or no enclosure) — mirroring web, where livestream UI never offers Download. Otherwise
 * shows Download → queued/downloading progress (with Cancel) → Downloaded (with Remove), and
 * surfaces failures with a retry. All state comes from `downloadManager` / `downloadsRepository`.
 */
export function DownloadControl({ item }: DownloadControlProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const record = useItemDownload(item.id_text);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);

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

  const eligibility = isItemDownloadable(item);
  if (!eligibility.ok) {
    return null;
  }

  const startDownload = async (): Promise<void> => {
    setNoticeKey(null);
    const result = await downloadManager.enqueue(item);
    if (!result.ok) {
      setNoticeKey('features.download.not_downloadable');
    }
  };

  const removeDownload = async (): Promise<void> => {
    await downloadManager.remove(item.id_text);
  };

  const status = record?.status ?? null;

  if (status === 'queued' || status === 'downloading') {
    const percent =
      record !== null && record.byteSize !== null && record.byteSize > 0
        ? Math.min(100, Math.round((record.bytesDownloaded / record.byteSize) * 100))
        : null;
    const statusLabel =
      status === 'queued'
        ? t('features.download.queued')
        : percent === null
          ? t('features.download.downloading_episode')
          : `${t('features.download.downloading_episode')} · ${percent}%`;

    return (
      <View>
        <View style={styles.progressRow} testID="episode-download-progress">
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void removeDownload();
            }}
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
          onPress={() => {
            void removeDownload();
          }}
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
          void startDownload();
        }}
        style={styles.button}
        testID="episode-download-button"
      >
        <Text style={styles.buttonLabel}>{t('features.download.download_episode')}</Text>
      </Pressable>
      {status === 'failed' ? (
        <Text style={styles.notice} testID="episode-download-error">
          {t('features.download.episode_download_error')}
        </Text>
      ) : null}
      {noticeKey !== null ? (
        <Text style={styles.notice} testID="episode-download-notice">
          {t(noticeKey)}
        </Text>
      ) : null}
    </View>
  );
}
