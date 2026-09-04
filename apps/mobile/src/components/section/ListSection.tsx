import type { ReactNode } from 'react';

import { ListEmpty } from '../state/ListEmpty';

type ListSectionProps<TItem> = {
  emptyMessageKey?: string;
  emptyTestID: string;
  items: TItem[];
  renderItem: (item: TItem, index: number, isLast: boolean) => ReactNode;
};

export function ListSection<TItem>({
  emptyMessageKey = 'misc.info',
  emptyTestID,
  items,
  renderItem,
}: ListSectionProps<TItem>) {
  if (items.length === 0) {
    return <ListEmpty messageKey={emptyMessageKey} testID={emptyTestID} />;
  }

  return <>{items.map((item, index) => renderItem(item, index, index === items.length - 1))}</>;
}
