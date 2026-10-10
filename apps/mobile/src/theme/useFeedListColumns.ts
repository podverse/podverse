import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useWindowDimensions } from 'react-native';

import { resolveFeedListColumns } from './resolveColumns';

export type FeedListColumns = {
  /** Fixed width for each cell; 0 when a single column of rows fills the list. */
  cellWidth: number;
  columns: number;
  /** Pass to the list's `onLayout`. */
  onListLayout: (event: LayoutChangeEvent) => void;
};

/**
 * Columns and cell width for a feed list, from the width the list actually has. The window width
 * stands in until the first layout; on a tablet the list then narrows by the tab rail's width.
 */
export function useFeedListColumns(options: {
  gap: number;
  horizontalInset: number;
  isGridView: boolean;
}): FeedListColumns {
  const { gap, horizontalInset, isGridView } = options;
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(0);

  const onListLayout = useCallback((event: LayoutChangeEvent) => {
    setListWidth(event.nativeEvent.layout.width);
  }, []);

  const { cellWidth, columns } = resolveFeedListColumns({
    gap,
    horizontalInset,
    isGridView,
    width: listWidth > 0 ? listWidth : windowWidth,
  });

  return { cellWidth, columns, onListLayout };
}
