import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, CountBadge, CoverImage, UnseenIndicator } from '../../components/primitives';
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
 * Live sits top-right, unseen is a presence dot bottom-right, and the downloaded count sits
 * bottom-left so the three can show together without stacking. Titles stay off the tile — the
 * list view is where full metadata lives — but each marker folds into the accessible name so a
 * screen reader is not left with blank squares.
 */
export function HomeFeedGridCell({ onPress, row, testID }: HomeFeedGridCellProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const liveLabel = row.metadata?.isLive === true ? t('media.livestream.live') : null;
  const unseenBadge = row.metadata?.unseenBadge ?? null;
  const unseenLabel = unseenBadge === null ? null : t('subscriptions.row.unseen_indicator_aria');

  const downloadedCount = row.metadata?.downloadedCount ?? 0;
  const downloadedLabel =
    downloadedCount > 0
      ? t('subscriptions.row.downloaded_count', { count: downloadedCount })
      : null;

  const accessibilityLabel = [row.title, liveLabel, unseenLabel, downloadedLabel]
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
          left: tokens.spacing.xs,
          position: 'absolute',
        },
        liveBadge: {
          position: 'absolute',
          right: tokens.spacing.xs,
          top: tokens.spacing.xs,
        },
        tile: {
          position: 'relative',
          width: '100%',
        },
        unseenIndicator: {
          bottom: tokens.spacing.xs,
          position: 'absolute',
          right: tokens.spacing.xs,
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
        {liveLabel !== null ? (
          <Badge
            label={liveLabel}
            style={styles.liveBadge}
            testID={`home-feed-cell-live-${row.id}`}
            tone="danger"
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
        {unseenBadge !== null ? (
          <UnseenIndicator
            style={styles.unseenIndicator}
            testID={`home-feed-cell-unseen-${row.id}`}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
