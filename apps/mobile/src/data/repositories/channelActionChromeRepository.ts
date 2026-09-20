import { eq } from 'drizzle-orm';

import {
  CHANNEL_ACTION_CHROME_KEY,
  rememberChannelIdentity as rememberChannelIdentityMemory,
  rememberChannelNotifications as rememberChannelNotificationsMemory,
  rememberChannelSubscribed as rememberChannelSubscribedMemory,
  snapshotPersistedChannelActionChrome,
} from '../../lib/channelActionChrome';
import { getDb, initializeDatabase, schema } from '../db';

const persistChannelActionChrome = async (): Promise<void> => {
  await initializeDatabase();
  const payload = JSON.stringify(snapshotPersistedChannelActionChrome());
  await getDb()
    .insert(schema.kvMeta)
    .values({
      key: CHANNEL_ACTION_CHROME_KEY,
      updatedAt: Date.now(),
      value: payload,
    })
    .onConflictDoUpdate({
      target: schema.kvMeta.key,
      set: {
        updatedAt: Date.now(),
        value: payload,
      },
    });
};

export const rememberChannelSubscribed = (idText: string, isSubscribed: boolean): void => {
  rememberChannelSubscribedMemory(idText, isSubscribed);
};

export const rememberChannelIdentity = (idText: string, channelId: number): void => {
  rememberChannelIdentityMemory(idText, channelId);
  void persistChannelActionChrome();
};

export const rememberChannelNotifications = (idText: string, enabled: boolean): void => {
  rememberChannelNotificationsMemory(idText, enabled);
  void persistChannelActionChrome();
};
