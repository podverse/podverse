import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../components/primitives';
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
  const { styles: themeStyles, tokens } = useTheme();

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          // Square so tiles line up on a row whatever each feed's artwork happens to be.
          aspectRatio: 1,
          backgroundColor: tokens.background.secondary,
          borderRadius: tokens.radii.sm,
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
        fallback: {
          alignItems: 'center',
          borderColor: themeStyles.border.borderColor,
          borderWidth: 1,
          justifyContent: 'center',
          padding: tokens.spacing.sm,
        },
        fallbackText: {
          color: themeStyles.textSecondary.color,
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Pressable
      accessibilityLabel={[row.title, unseenLabel].filter((part) => part !== null).join(', ')}
      accessibilityRole="button"
      onPress={() => {
        onPress(row);
      }}
      style={styles.cell}
      testID={testID ?? `home-feed-cell-${row.id}`}
    >
      {row.imageUrl !== null ? (
        <Image source={{ uri: row.imageUrl }} style={styles.artwork} />
      ) : (
        <View style={[styles.artwork, styles.fallback]}>
          {/* The title, not a generic "Image" placeholder: several untitled grey squares would be
              indistinguishable, and this is the one view with no title beneath the artwork. */}
          <Text numberOfLines={3} style={styles.fallbackText}>
            {row.title}
          </Text>
        </View>
      )}
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
