'use client';

import { useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  highlightedIndex?: number;
  autoScrollOn?: boolean;
}

export function VirtualizedList<T>({
  items,
  height,
  renderItem,
  highlightedIndex,
  autoScrollOn,
}: VirtualizedListProps<T>) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Ensure items is always an array
  const safeItems = items ?? [];
  const itemCount = safeItems.length;

  // Check if the highlighted index is valid (within bounds of items array)
  const isValidIndex =
    itemCount > 0 &&
    highlightedIndex !== undefined &&
    highlightedIndex >= 0 &&
    highlightedIndex < itemCount;

  useEffect(() => {
    if (autoScrollOn && virtuosoRef.current && isValidIndex) {
      virtuosoRef.current.scrollToIndex({
        index: highlightedIndex,
        align: 'start',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, autoScrollOn, isValidIndex]);

  // Don't render Virtuoso at all when list is empty - it has issues with empty state
  if (itemCount === 0) {
    return <div style={{ height }} />;
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ height }}
      totalCount={itemCount}
      itemContent={(index: number) => {
        const item = safeItems[index];
        return item ? renderItem(item, index) : null;
      }}
    />
  );
}
