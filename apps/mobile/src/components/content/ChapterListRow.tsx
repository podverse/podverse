import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { CoverImage } from '../primitives/CoverImage';
import { ListRow } from '../primitives/ListRow';

export type ChapterListRowProps = {
  artworkAccessibilityLabel: string;
  artworkUri: string | null;
  isLast: boolean;
  onPress?: () => void;
  paddingHorizontal?: number;
  showArtwork: boolean;
  testID?: string;
  timeRange: string;
  title: string;
};

/**
 * Chapter list row used on the full player and episode detail. Artwork is omitted when the
 * section has no chapter images; when any chapter has an image, every row shows one (chapter
 * URL, then item/channel/system fallback).
 */
export function ChapterListRow({
  artworkAccessibilityLabel,
  artworkUri,
  isLast,
  onPress,
  paddingHorizontal,
  showArtwork,
  testID,
  timeRange,
  title,
}: ChapterListRowProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: LIST_ROW_ARTWORK_SIZE,
          width: LIST_ROW_ARTWORK_SIZE,
        },
        row: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: paddingHorizontal ?? 0,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
      }),
    [paddingHorizontal, themeStyles]
  );

  return (
    <View style={[styles.row, isLast ? styles.rowLast : null]}>
      <ListRow
        leading={
          showArtwork ? (
            <CoverImage
              accessibilityLabel={artworkAccessibilityLabel}
              opensViewer={onPress === undefined}
              style={styles.artwork}
              testID={testID === undefined ? undefined : `${testID}-artwork`}
              uri={artworkUri}
            />
          ) : undefined
        }
        onPress={onPress}
        subtitle={timeRange}
        testID={testID}
        title={title}
      />
    </View>
  );
}
