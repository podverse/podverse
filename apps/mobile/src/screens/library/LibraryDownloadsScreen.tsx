import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { downloadManager } from '../../downloads/downloadManager';
import { formatDownloadBytes } from '../../downloads/downloadQuota';
import type { DownloadRecord } from '../../downloads/downloadTypes';
import { useDownloadsList, useDownloadStorage } from '../../downloads/useDownloads';
import { useTheme } from '../../theme/useTheme';

const statusLabelKey = (record: DownloadRecord): string => {
  switch (record.status) {
    case 'complete':
      return 'features.download.episode_downloaded';
    case 'failed':
      return 'features.download.episode_download_error';
    case 'queued':
      return 'features.download.queued';
    default:
      return 'features.download.downloading_episode';
  }
};

const progressPercent = (record: DownloadRecord): number | null => {
  if (record.status !== 'downloading' || record.byteSize === null || record.byteSize <= 0) {
    return null;
  }
  return Math.min(100, Math.round((record.bytesDownloaded / record.byteSize) * 100));
};

export function LibraryDownloadsScreen() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { downloads, isLoading, errorKey, reload } = useDownloadsList();
  const {
    usedBytes,
    quotaBytes,
    autoDeleteEnabled,
    setAutoDeleteEnabled,
    autoRemovedCount,
    clearAutoRemovedNotice,
  } = useDownloadStorage();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        actionButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
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
        manageBanner: {
          backgroundColor: themeStyles.buttonSecondary.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing.md,
          padding: tokens.spacing.md,
        },
        manageBannerText: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 13,
          marginRight: tokens.spacing.md,
        },
        manageRow: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing.md,
        },
        manageRowLabel: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 14,
          marginRight: tokens.spacing.md,
        },
        usageText: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginBottom: tokens.spacing.md,
        },
        row: {
          alignItems: 'center',
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: tokens.spacing.sm,
          padding: tokens.spacing.md,
        },
        rowStatus: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginTop: tokens.spacing.xs,
        },
        rowTextColumn: {
          flex: 1,
          marginRight: tokens.spacing.md,
        },
        rowTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  const renderRow = ({ item }: { item: DownloadRecord }) => {
    const percent = progressPercent(item);
    const statusText =
      percent === null ? t(statusLabelKey(item)) : `${t(statusLabelKey(item))} · ${percent}%`;
    const actionLabel =
      item.status === 'complete' ? t('features.download.remove') : t('misc.cancel');

    return (
      <View style={styles.row} testID={`download-row-${item.itemIdText}`}>
        <View style={styles.rowTextColumn}>
          <Text numberOfLines={2} style={styles.rowTitle}>
            {item.title ?? item.itemIdText}
          </Text>
          <Text style={styles.rowStatus} testID={`download-row-status-${item.itemIdText}`}>
            {statusText}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void downloadManager.remove(item.itemIdText);
          }}
          style={styles.actionButton}
          testID={`download-row-action-${item.itemIdText}`}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      </View>
    );
  };

  const hasDownloads = downloads.length > 0;

  const renderHeader = () => (
    <View>
      <Text style={styles.heading}>{t('nav.tab.downloads')}</Text>

      <Text style={styles.usageText} testID="library-downloads-usage">
        {`${t('features.download.storage_used')}: ${formatDownloadBytes(usedBytes)} / ${formatDownloadBytes(quotaBytes)}`}
      </Text>

      {autoRemovedCount > 0 ? (
        <View style={styles.manageBanner} testID="library-downloads-auto-removed-notice">
          <Text style={styles.manageBannerText}>{t('features.download.auto_removed_notice')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={clearAutoRemovedNotice}
            style={styles.actionButton}
            testID="library-downloads-auto-removed-dismiss"
          >
            <Text style={styles.actionLabel}>{t('features.download.dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.manageRow}>
        <Text style={styles.manageRowLabel}>{t('features.download.auto_delete_label')}</Text>
        <Switch
          onValueChange={(next) => {
            void setAutoDeleteEnabled(next);
          }}
          testID="library-downloads-auto-delete-toggle"
          value={autoDeleteEnabled}
        />
      </View>

      {hasDownloads ? (
        <View style={styles.manageRow}>
          <Text style={styles.manageRowLabel}>{t('features.download.delete_all_label')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void downloadManager.removeAll();
            }}
            style={styles.actionButton}
            testID="library-downloads-delete-all"
          >
            <Text style={styles.actionLabel}>{t('features.download.delete_all')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.screen} testID="library-downloads-screen">
        <View style={styles.content}>
          <Text style={styles.heading}>{t('nav.tab.downloads')}</Text>
          <ListLoading testID="library-downloads-loading" />
        </View>
      </View>
    );
  }

  if (errorKey !== null) {
    return (
      <View style={styles.screen} testID="library-downloads-screen">
        <View style={styles.content}>
          <Text style={styles.heading}>{t('nav.tab.downloads')}</Text>
          <ListError messageKey={errorKey} onRetry={reload} testID="library-downloads-error" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="library-downloads-screen">
      <FlatList
        contentContainerStyle={styles.content}
        data={downloads}
        keyExtractor={(item) => item.itemIdText}
        ListEmptyComponent={
          <ListEmpty messageKey="features.download.empty" testID="library-downloads-empty" />
        }
        ListHeaderComponent={renderHeader}
        renderItem={renderRow}
      />
    </View>
  );
}
