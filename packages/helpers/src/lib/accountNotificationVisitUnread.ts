import type { DTOAccountNotification } from '../dtos/account/accountNotification.js';

export type NotificationVisitUnreadResult = {
  rows: DTOAccountNotification[];
  visitUnreadIds: ReadonlySet<number>;
};

/**
 * Opening the inbox marks every notification seen on the server, so a reload during the same
 * visit reports those rows read. An inbox visit keeps the unseen indicator on every row that was
 * unseen at any point in the visit. Records the ids `rows` reports unread, then returns `rows`
 * with every recorded id unread. Returns the same set and the same array when nothing changes.
 */
export function applyNotificationVisitUnread(
  visitUnreadIds: ReadonlySet<number>,
  rows: DTOAccountNotification[]
): NotificationVisitUnreadResult {
  let nextIds: Set<number> | null = null;
  for (const row of rows) {
    if (row.is_unread && !visitUnreadIds.has(row.id)) {
      if (nextIds === null) {
        nextIds = new Set(visitUnreadIds);
      }
      nextIds.add(row.id);
    }
  }
  const ids: ReadonlySet<number> = nextIds ?? visitUnreadIds;

  let changed = false;
  const nextRows = rows.map((row) => {
    if (row.is_unread || !ids.has(row.id)) {
      return row;
    }
    changed = true;
    return { ...row, is_unread: true };
  });

  return { rows: changed ? nextRows : rows, visitUnreadIds: ids };
}
