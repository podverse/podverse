import type { FindOperator } from 'typeorm';
import { In, Not } from 'typeorm';

export type IdListFilter = { empty: true } | { empty: false; id?: FindOperator<number> };

export function resolveIdListFilter(includeIds?: number[], excludeIds?: number[]): IdListFilter {
  if (includeIds && includeIds.length === 0) {
    return { empty: true };
  }

  if (includeIds?.length && excludeIds?.length) {
    const exclude = new Set(excludeIds);
    const remaining = includeIds.filter((id) => !exclude.has(id));
    if (remaining.length === 0) {
      return { empty: true };
    }
    return { empty: false, id: In(remaining) };
  }

  if (includeIds?.length) {
    return { empty: false, id: In(includeIds) };
  }

  if (excludeIds?.length) {
    return { empty: false, id: Not(In(excludeIds)) };
  }

  return { empty: false };
}
