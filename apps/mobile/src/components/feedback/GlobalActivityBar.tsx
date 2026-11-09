import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  countActiveDownloading,
  countInProgressDownloads,
} from '../../downloads/inProgressDownloadCount';
import { useDownloadsList } from '../../downloads/useDownloads';
import { useSyncIndicatorPresentation } from '../../sync/syncIndicatorPresentation';
import { globalActivityBarLayout } from '../../theme/bottomChromeOverlay';
import { bottomChromeStripTextStyle } from '../../theme/bottomChromeStrip';
import { useTheme } from '../../theme/useTheme';

export type GlobalActivityBarProps = {
  /**
   * Extra bottom padding, in dp. Zero where the bar sits above a tab bar that already owns the
   * home-indicator inset; the device inset where it is the bottom-most thing on screen.
   */
  bottomInset?: number;
};

/**
 * Bottom chrome for serial sync progress and parallel download transfers.
 *
 * Downloads stay off the sync queue (that queue exists to keep background work serial). This bar
 * can show both lines at once: sync job label + count + spinner, and "Downloading X of Y" with a
 * spinner while transfers run. Presence is derived from live state — no dismiss control.
 */
export function GlobalActivityBar({ bottomInset = 0 }: GlobalActivityBarProps) {
  const { t } = useTranslation();
  const syncPresentation = useSyncIndicatorPresentation();
  const { downloads } = useDownloadsList();
  const { styles: themeStyles, tokens } = useTheme();

  const { completedCount, labelKey, totalCount, visible: syncVisible } = syncPresentation;
  const syncLabel = !syncVisible || labelKey === null ? null : t(labelKey);

  const inProgressCount = countInProgressDownloads(downloads);
  const activeCount = countActiveDownloading(downloads);
  const downloadsVisible = inProgressCount > 0;
  const downloadLabel = downloadsVisible
    ? t('features.download.activity_progress', {
        active: activeCount,
        total: inProgressCount,
      })
    : null;

  const layout = globalActivityBarLayout({
    borderTopWidth: StyleSheet.hairlineWidth,
    bottomInset,
    downloadsVisible,
    spacing: tokens.spacing,
    syncVisible,
  });

  const announcedLabelRef = useRef<string | null>(null);
  useEffect(() => {
    const combined = [syncLabel, downloadLabel].filter((part) => part !== null).join('. ');
    if (combined.length === 0) {
      announcedLabelRef.current = null;
      return;
    }
    if (announcedLabelRef.current === combined) {
      return;
    }
    announcedLabelRef.current = combined;
    AccessibilityInfo.announceForAccessibility(combined);
  }, [downloadLabel, syncLabel]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: tokens.background.secondary,
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: layout.borderTopWidth,
          paddingBottom: layout.paddingBottom,
          paddingHorizontal: tokens.spacing.lg,
        },
        count: {
          ...bottomChromeStripTextStyle(),
          color: themeStyles.textSecondary.color,
        },
        label: {
          ...bottomChromeStripTextStyle(),
          color: themeStyles.textSecondary.color,
          flexShrink: 1,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          height: layout.rowHeight,
          justifyContent: 'space-between',
        },
        sectionFollow: {
          marginTop: layout.downloadsFollowMarginTop,
        },
        syncSection: {
          paddingTop: layout.syncPaddingTop,
        },
        trailing: {
          alignItems: 'center',
          flexDirection: 'row',
          flexShrink: 0,
          gap: tokens.spacing.md,
        },
      }),
    [
      layout.borderTopWidth,
      layout.downloadsFollowMarginTop,
      layout.paddingBottom,
      layout.rowHeight,
      layout.syncPaddingTop,
      themeStyles,
      tokens,
    ]
  );

  if (!syncVisible && !downloadsVisible) {
    return null;
  }

  const syncCountText = t('sync.progress', { completed: completedCount, total: totalCount });

  return (
    <View style={styles.container} testID="global-activity-bar">
      {syncVisible ? (
        <View
          accessible
          accessibilityLabel={syncLabel ?? undefined}
          accessibilityRole="progressbar"
          accessibilityValue={{
            max: totalCount,
            min: 0,
            now: completedCount,
            text: syncCountText,
          }}
          style={styles.syncSection}
          testID="sync-progress-bar"
        >
          <View style={styles.row}>
            <Text numberOfLines={1} style={styles.label} testID="sync-progress-label">
              {syncLabel}
            </Text>
            <View style={styles.trailing}>
              <Text style={styles.count} testID="sync-progress-count">
                {syncCountText}
              </Text>
              <ActivityIndicator
                accessibilityElementsHidden
                color={themeStyles.textSecondary.color}
                importantForAccessibility="no"
                size="small"
                testID="sync-progress-spinner"
              />
            </View>
          </View>
        </View>
      ) : null}
      {downloadsVisible && downloadLabel !== null ? (
        <View
          accessible
          accessibilityLabel={downloadLabel}
          accessibilityRole="text"
          accessibilityState={{ busy: true }}
          style={syncVisible ? styles.sectionFollow : undefined}
          testID="download-activity-bar"
        >
          <View style={styles.row}>
            <Text numberOfLines={1} style={styles.label} testID="download-activity-label">
              {downloadLabel}
            </Text>
            <ActivityIndicator
              accessibilityElementsHidden
              color={themeStyles.textSecondary.color}
              importantForAccessibility="no"
              size="small"
              testID="download-activity-spinner"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
