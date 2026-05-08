import type { SortDirection } from '../../../lib/cookies/sortPrefsCookie';

export type { SortDirection };

export type TableColumn<TKey extends string = string> = {
  align?: 'center' | 'left' | 'right';
  defaultSortOrder?: SortDirection;
  header: string;
  key: TKey;
  sortable?: boolean;
};
