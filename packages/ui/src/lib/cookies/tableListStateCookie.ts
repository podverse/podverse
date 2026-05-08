import { parseCookieJsonObject, serializeCookieJsonObject } from './cookieJson';

export const TABLE_LIST_STATE_COOKIE_NAME_DEFAULT = 'podverse_table_list_state';

export type TableListStateEntry = {
  search?: string;
  /** Comma-separated column ids included in search funnel. */
  columns?: string;
  page?: number;
  limit?: number;
  filters?: Record<string, string>;
};

export type TableListStateMap = Record<string, TableListStateEntry>;

function parseFilters(raw: unknown): Record<string, string> | undefined {
  if (raw === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string') {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseEntry(raw: unknown): TableListStateEntry | null {
  if (raw === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const entry: TableListStateEntry = {};
  if (typeof o.search === 'string') {
    entry.search = o.search;
  }
  if (typeof o.columns === 'string') {
    entry.columns = o.columns;
  }
  if (typeof o.page === 'number' && Number.isFinite(o.page) && o.page >= 1) {
    entry.page = Math.floor(o.page);
  }
  if (typeof o.limit === 'number' && Number.isFinite(o.limit) && o.limit >= 1) {
    entry.limit = Math.floor(o.limit);
  }
  const filters = parseFilters(o.filters);
  if (filters !== undefined) {
    entry.filters = filters;
  }
  return entry;
}

export function readTableListStateMap(cookieValue: string | undefined): TableListStateMap {
  const root = parseCookieJsonObject(cookieValue);
  const out: TableListStateMap = {};
  for (const [listKey, raw] of Object.entries(root)) {
    const entry = parseEntry(raw);
    if (entry !== null && Object.keys(entry).length > 0) {
      out[listKey] = entry;
    }
  }
  return out;
}

/**
 * Merge a patch for one list key into the serialized cookie value (pure).
 */
export function mergeTableListStateCookie(
  cookieValue: string | undefined,
  listKey: string,
  patch: Partial<TableListStateEntry>
): string {
  const map = readTableListStateMap(cookieValue) as Record<string, TableListStateEntry>;
  const prev = map[listKey] ?? {};
  const next: TableListStateEntry = { ...prev };
  if (patch.search !== undefined) {
    next.search = patch.search;
  }
  if (patch.columns !== undefined) {
    next.columns = patch.columns;
  }
  if (patch.page !== undefined) {
    next.page = patch.page;
  }
  if (patch.limit !== undefined) {
    next.limit = patch.limit;
  }
  if (patch.filters !== undefined) {
    next.filters = patch.filters;
  }
  map[listKey] = next;
  return serializeCookieJsonObject(map as Record<string, unknown>);
}

export function serializeTableListStateMap(map: TableListStateMap): string {
  return serializeCookieJsonObject(map as Record<string, unknown>);
}
