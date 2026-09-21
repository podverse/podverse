import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';

import { formatPlaylistRowSubtitle, playlistCreatorLabel } from '../../lib/rows/catalogRowCopy';
import { useTheme } from '../../theme/useTheme';
import { ListRow } from '../primitives/ListRow';

export type PlaylistListRowProps = {
  isLast: boolean;
  onPress?: () => void;
  playlist: DTOPlaylist;
  /** Public and followed lists name the owner. Owned lists do not. */
  showCreator: boolean;
  testID?: string;
};

/**
 * Text-only playlist catalog row. Matches web `ListPlaylistRow`: title, item count, optional
 * description, and an optional creator line. Playlist DTOs have no artwork.
 */
export function PlaylistListRow({
  isLast,
  onPress,
  playlist,
  showCreator,
  testID,
}: PlaylistListRowProps) {
  const { t } = useTranslation();
  const { styles: themeStyles } = useTheme();
  const title = playlist.title?.trim() || playlist.id_text;
  const subtitle = formatPlaylistRowSubtitle(playlist, t);
  const creator = showCreator ? playlistCreatorLabel(playlist, t) : undefined;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
      }),
    [themeStyles]
  );

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
}
