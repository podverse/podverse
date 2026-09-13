import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Badge, CoverImage } from '../../components/primitives';
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
 * Carries the unseen badge and nothing else, because a tile is small enough that a title and a
 * metadata line would crowd the artwork the grid exists to show. The list view remains the one that
 * states everything about a subscription; the grid trades that detail for seeing more at once.
 *
 * The title is still the tile's accessible name. Without it a screen reader reaches a wall of
 * unlabelled squares, and artwork alone identifies nothing to a user who cannot see it — so the
 * grid must cost that user no information even though it shows less.
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

  const accessibilityLabel = [row.title, unseenLabel].filter((part) => part !== null).join(', ');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          // Square so tiles line up on a row whatever each feed's artwork happens to be.
          aspectRatio: 1,
          width: '100%',
        },
        badge: {
          position: 'absolute',
          right: tokens.spacing.xs,
          top: tokens.spacing.xs,
        },
        cell: {
          marginBottom: tokens.spacing.md,
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
      {/* Artwork is decorative here: the Pressable owns the accessible name (title + badge). */}
      <CoverImage
        fallbackLabel={row.title}
        opensViewer={false}
        style={styles.artwork}
        uri={row.imageUrl}
      />
      {unseenLabel !== null ? (
        <Badge
          label={unseenLabel}
          style={styles.badge}
          testID={`home-feed-cell-unseen-${row.id}`}
          tone="accent"
        />
      ) : null}
    </Pressable>
  );
}
