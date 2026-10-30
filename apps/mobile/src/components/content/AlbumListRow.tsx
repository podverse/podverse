import type { ReactNode } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAddByRssArtworkHeaders } from '../../hooks/useAddByRssArtworkHeaders';
import { LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { CoverImage } from '../primitives/CoverImage';
import { ListRow } from '../primitives/ListRow';

export type AlbumListRowProps = {
  /** Spoken name of the row. Defaults to the title and subtitle. */
  accessibilityLabel?: string;
  /** Add by RSS albums pass their feed URL so artwork can carry the feed's credentials. */
  addByRssFeedUrl: string | null;
  /** True while a tap on this row is still opening its screen. */
  busy?: boolean;
  imageUrl: string | null;
  onPress: () => void;
  subtitle?: string;
  testID: string;
  title: string;
  /** Far-right content inside the row, such as an Add by RSS marker. */
  trailing?: ReactNode;
};

const coverStyles = StyleSheet.create({
  image: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
});

/** Content rows draw a top hairline, including the first row. */
const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) => ({
  row: {
    borderTopColor: themeStyles.border.borderColor,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

/**
 * One album in a list: square cover, title, an optional subtitle, and an optional trailing node.
 * The whole row opens it.
 */
export const AlbumListRow = memo(function AlbumListRow({
  accessibilityLabel,
  addByRssFeedUrl,
  busy,
  imageUrl,
  onPress,
  subtitle,
  testID,
  title,
  trailing,
}: AlbumListRowProps) {
  const styles = useThemedStyles(createStyles);
  const headers = useAddByRssArtworkHeaders(addByRssFeedUrl, imageUrl);

  return (
    <View style={styles.row}>
      <ListRow
        leading={
          <CoverImage
            addByRssFeedUrl={addByRssFeedUrl}
            decodeEdge={LIST_ROW_ARTWORK_SIZE}
            headers={headers}
            opensViewer={false}
            style={coverStyles.image}
            uri={imageUrl}
          />
        }
        accessibilityLabel={accessibilityLabel}
        busy={busy}
        onPress={onPress}
        subtitle={subtitle}
        testID={testID}
        title={title}
        trailing={trailing}
      />
    </View>
  );
});
