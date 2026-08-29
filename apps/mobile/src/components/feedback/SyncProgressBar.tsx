import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { useSync } from '../../sync';
import { useTheme } from '../../theme/useTheme';
import { ProgressTrack } from '../primitives/ProgressTrack';

export type SyncProgressBarProps = {
  /**
   * Extra bottom padding, in dp. Zero where the bar sits above a tab bar that already owns the
   * home-indicator inset; the device inset where it is the bottom-most thing on screen.
   */
  bottomInset?: number;
};

/**
 * Tells the user what the background sync is doing and how much of it is left.
 *
 * This is what keeps the fast-start tradeoff honest: screens render from cache immediately, so
 * something has to say the app is still catching up. Presence is derived entirely from queue state
 * — there is no dismiss control and no lingering "done", and a failed job is invisible here because
 * the queue skips it and carries on.
 *
 * The denominator grows mid-run as jobs discover more work, and that is shown as it happens rather
 * than smoothed into a fixed total that would have to lie.
 */
export function SyncProgressBar({ bottomInset = 0 }: SyncProgressBarProps) {
  const { t } = useTranslation();
  const { state } = useSync();
  const { styles: themeStyles, tokens } = useTheme();

  const { activeLabelKey, completedCount, status, totalCount } = state;
  const label = activeLabelKey === null ? null : t(activeLabelKey);

  // Announce the job, not the count. A forty-page subscription walk holds one label the whole way
  // through, so this speaks when the work changes character and stays quiet otherwise.
  const announcedLabelRef = useRef<string | null>(null);
  useEffect(() => {
    if (label === null) {
      announcedLabelRef.current = null;
      return;
    }
    if (announcedLabelRef.current === label) {
      return;
    }
    announcedLabelRef.current = label;
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: tokens.background.secondary,
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          paddingBottom: tokens.spacing.sm + bottomInset,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.sm,
        },
        count: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
        },
        label: {
          color: themeStyles.textSecondary.color,
          flexShrink: 1,
          fontSize: 12,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          justifyContent: 'space-between',
          marginTop: tokens.spacing.sm,
        },
      }),
    [bottomInset, themeStyles, tokens]
  );

  // `paused` means the platform reported no connectivity and the run is parked. Nothing is syncing,
  // so nothing is claimed; the bar returns when the queue resumes.
  if (status !== 'running' || label === null) {
    return null;
  }

  const countText = t('sync.progress', { completed: completedCount, total: totalCount });

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: totalCount,
        min: 0,
        now: completedCount,
        text: countText,
      }}
      style={styles.container}
      testID="sync-progress-bar"
    >
      <ProgressTrack
        fillTestID="sync-progress-fill"
        ratio={totalCount > 0 ? completedCount / totalCount : 0}
      />
      <View style={styles.row}>
        <Text numberOfLines={1} style={styles.label} testID="sync-progress-label">
          {label}
        </Text>
        <Text style={styles.count} testID="sync-progress-count">
          {countText}
        </Text>
      </View>
    </View>
  );
}
