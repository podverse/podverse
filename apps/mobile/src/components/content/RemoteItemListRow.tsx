import { memo, useCallback } from 'react';

import type { RemoteItemListEntry } from '../../lib/remoteItems/remoteItemListEntries';
import { AlbumListRow } from './AlbumListRow';

export type RemoteItemListRowProps = {
  entry: RemoteItemListEntry;
  onPress: (entry: RemoteItemListEntry) => void;
  testID: string;
  /** `t('misc.untitled')` from the list, so each row does not subscribe to i18n. */
  untitledLabel: string;
};

/**
 * One parsed or stub row in a podroll, a remote item list, or Not Yet Added albums.
 * The row opens whatever it names.
 */
export const RemoteItemListRow = memo(function RemoteItemListRow({
  entry,
  onPress,
  testID,
  untitledLabel,
}: RemoteItemListRowProps) {
  const handlePress = useCallback(() => {
    onPress(entry);
  }, [entry, onPress]);

  return (
    <AlbumListRow
      addByRssFeedUrl={null}
      imageUrl={entry.imageUrl}
      onPress={handlePress}
      subtitle={entry.subtitle ?? undefined}
      testID={testID}
      title={entry.title ?? untitledLabel}
    />
  );
});
