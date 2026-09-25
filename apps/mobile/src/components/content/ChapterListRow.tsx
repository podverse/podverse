import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
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

const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) => ({
  artwork: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
  row: {
    borderBottomColor: themeStyles.border.borderColor,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
});

/**
 * Chapter list row used on the full player and episode detail. Artwork is omitted when the
 * section has no chapter images; when any chapter has an image, every row shows one (chapter
 * URL, then item/channel/system fallback).
 */
export const ChapterListRow = memo(function ChapterListRow({
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
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.row,
        isLast ? styles.rowLast : null,
        { paddingHorizontal: paddingHorizontal ?? 0 },
      ]}
    >
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
});
