'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';

export type VirtualizedListProps<T> = {
  items: T[];
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  highlightedIndex?: number;
  autoScrollOn?: boolean;
};

export function VirtualizedList<T>({
  items,
  height,
  renderItem,
  highlightedIndex,
  autoScrollOn,
}: VirtualizedListProps<T>) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const safeItems = items ?? [];
  const itemCount = safeItems.length;

  const isValidIndex =
    itemCount > 0 &&
    highlightedIndex !== undefined &&
    highlightedIndex >= 0 &&
    highlightedIndex < itemCount;

  useEffect(() => {
    if (!autoScrollOn || !virtuosoRef.current || !isValidIndex) {
      return;
    }
    if (highlightedIndex === undefined) {
      return;
    }
    virtuosoRef.current.scrollToIndex({
      index: highlightedIndex,
      align: 'start',
      behavior: 'smooth',
    });
  }, [highlightedIndex, autoScrollOn, isValidIndex]);

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
