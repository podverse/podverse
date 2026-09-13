import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CountBadge, CoverImage } from '../../components/primitives';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from './homeFeedData';

type HomeFeedGridCellProps = {
  onPress: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
  testID?: string;
};

/**
 * One artwork tile in the Home grid.
 *
 * Unseen stays top-right (accent); downloaded count sits bottom-right (muted gray) so both can
 * show without stacking. Each is a `CountBadge` — a circle at one digit, a horizontal capsule
 * at two. Titles stay off the tile — the list view is where full metadata lives — but both
 * counts fold into the accessible name so a screen reader is not left with blank squares.
 */
export function HomeFeedGridCell({ onPress, row, testID }: HomeFeedGridCellProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const unseenBadge = row.metadata?.unseenBadge ?? null;
  const unseenLabel =
    unseenBadge === null
      ? null
      : t(
          unseenBadge.isCapped
            ? 'subscriptions.row.unseen_count_capped'
            : 'subscriptions.row.unseen_count',
          { count: unseenBadge.count }
        );

  const downloadedCount = row.metadata?.downloadedCount ?? 0;
  const downloadedLabel =
    downloadedCount > 0
      ? t('subscriptions.row.downloaded_count', { count: downloadedCount })
      : null;

  const accessibilityLabel = [row.title, unseenLabel, downloadedLabel]
    .filter((part) => part !== null)
    .join(', ');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          // Square so tiles line up on a row whatever each feed's artwork happens to be.
          aspectRatio: 1,
          width: '100%',
        },
        cell: {
          marginBottom: tokens.spacing.md,
        },
        downloadedBadge: {
          bottom: tokens.spacing.xs,
          position: 'absolute',
          right: tokens.spacing.xs,
        },
        tile: {
          position: 'relative',
          width: '100%',
        },
        unseenBadge: {
          position: 'absolute',
          right: tokens.spacing.xs,
          top: tokens.spacing.xs,
        },
      }),
    [tokens]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="imagebutton"
      accessible
      onPress={() => {
        onPress(row);
      }}
      style={styles.cell}
      testID={testID ?? `home-feed-cell-${row.id}`}
    >
      <View style={styles.tile}>
        {/* Artwork is decorative here: the Pressable owns the accessible name (title + badges). */}
        <CoverImage
          fallbackLabel={row.title}
          opensViewer={false}
          style={styles.artwork}
          uri={row.imageUrl}
        />
        {unseenBadge !== null ? (
          <CountBadge
            count={unseenBadge.count}
            isCapped={unseenBadge.isCapped}
            style={styles.unseenBadge}
            testID={`home-feed-cell-unseen-${row.id}`}
            tone="accent"
          />
        ) : null}
        {downloadedCount > 0 ? (
          <CountBadge
            count={downloadedCount}
            style={styles.downloadedBadge}
            testID={`home-feed-cell-downloaded-${row.id}`}
            tone="muted"
          />
        ) : null}
      </View>
    </Pressable>
  );
}
