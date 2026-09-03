import type { ReactNode } from 'react';

import type {
  ReorderableItemContext,
  ReorderableSectionsProps,
  ReorderRowAccessibility,
} from './ReorderableSections';
import { ReorderableSections } from './ReorderableSections';

const LIST_SECTION_ID = 'list';

export type ReorderListEvent = {
  fromIndex: number;
  toIndex: number;
};

export type ReorderableListProps<T> = {
  data: readonly T[];
  handleTestID?: ReorderableSectionsProps<T>['handleTestID'];
  keyExtractor: (item: T) => string;
  onDragActiveChange?: (isActive: boolean) => void;
  onReorder: (event: ReorderListEvent) => void;
  renderItem: (item: T, context: ReorderableItemContext) => ReactNode;
  renderList?: (children: ReactNode) => ReactNode;
  rowAccessibility?: (item: T, context: ReorderableItemContext) => ReorderRowAccessibility;
};

/**
 * Single-list reorder. Screens depend on this contract, not on the gesture engine behind it.
 */
export function ReorderableList<T>({
  data,
  handleTestID,
  keyExtractor,
  onDragActiveChange,
  onReorder,
  renderItem,
  renderList,
  rowAccessibility,
}: ReorderableListProps<T>) {
  return (
    <ReorderableSections
      handleTestID={handleTestID}
      keyExtractor={keyExtractor}
      onDragActiveChange={onDragActiveChange}
      onDrop={(event) => {
        if (event.fromIndex === event.toIndex) {
          return;
        }
        onReorder({ fromIndex: event.fromIndex, toIndex: event.toIndex });
      }}
      renderItem={renderItem}
      renderSection={(_sectionId, children) =>
        renderList === undefined ? children : renderList(children)
      }
      rowAccessibility={rowAccessibility}
      sections={[{ id: LIST_SECTION_ID, items: data }]}
    />
  );
}
