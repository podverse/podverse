import type { DTOAccountNotification, DTOAccountNotificationPreference } from '@podverse/helpers';
import type { AccountNotification, AccountNotificationPreference } from '@podverse/orm';

export const accountNotificationToJson = (
  row: AccountNotification,
  lastSeenAt: Date | null
): DTOAccountNotification => {
  const isNew = lastSeenAt === null ? true : row.created_at.getTime() > lastSeenAt.getTime();
  return {
    id: row.id,
    account_id: row.account_id,
    body: row.body ?? null,
    category: row.category,
    created_at: row.created_at.toISOString(),
    expires_at: row.expires_at.toISOString(),
    is_new: isNew,
    link_path: row.link_path ?? null,
    payload: row.payload ?? null,
    title: row.title,
  };
};

export const accountNotificationPreferenceToJson = (
  row: AccountNotificationPreference
): DTOAccountNotificationPreference => ({
  id: row.id,
  account_id: row.account_id,
  category: row.category,
  in_app_enabled: row.in_app_enabled,
  push_enabled: row.push_enabled,
});
