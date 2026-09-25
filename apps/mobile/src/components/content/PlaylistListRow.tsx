import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';

import { formatPlaylistRowSubtitle, playlistCreatorLabel } from '../../lib/rows/catalogRowCopy';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ListRow } from '../primitives/ListRow';

export type PlaylistListRowProps = {
  isLast: boolean;
  onPress?: () => void;
  playlist: DTOPlaylist;
  /** Public and followed lists name the owner. Owned lists do not. */
  showCreator: boolean;
  testID?: string;
};

const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) => ({
  row: {
    borderBottomColor: themeStyles.border.borderColor,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
});

/**
 * Text-only playlist catalog row. Matches web `ListPlaylistRow`: title, item count, optional
 * description, and an optional creator line. Playlist DTOs have no artwork.
 */
export const PlaylistListRow = memo(function PlaylistListRow({
  isLast,
  onPress,
  playlist,
  showCreator,
  testID,
}: PlaylistListRowProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const title = playlist.title?.trim() || playlist.id_text;
  const subtitle = formatPlaylistRowSubtitle(playlist, t);
  const creator = showCreator ? playlistCreatorLabel(playlist, t) : undefined;

  return (
    <View style={[styles.row, isLast ? styles.rowLast : null]}>
      <ListRow
        meta={creator}
        metaTestID={testID === undefined ? undefined : `${testID}-creator`}
        onPress={onPress}
        subtitle={subtitle}
        subtitleNumberOfLines={1}
        subtitleTestID={testID === undefined ? undefined : `${testID}-subtitle`}
        testID={testID}
        title={title}
      />
    </View>
  );
});
