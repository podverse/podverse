import { and, eq } from 'drizzle-orm';

import { getDb, initializeDatabase, schema } from '../../data/db';
import type { PlaybackOutboxResourceKind } from '../../data/repositories/playbackOutbox';
import { DEVICE_PLAYBACK_ACCOUNT_ID, DEVICE_PLAYBACK_QUEUE_ID } from './devicePlaybackKey';

const ITEM_RESOURCE: PlaybackOutboxResourceKind = 'item';

/** Seconds stored for a directory item while signed out. Null when nothing was saved. */
export const readDeviceItemPlaybackSeconds = async (itemIdText: string): Promise<number | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ playbackPosition: schema.playbackLocalState.playbackPosition })
    .from(schema.playbackLocalState)
    .where(
      and(
        eq(schema.playbackLocalState.accountIdText, DEVICE_PLAYBACK_ACCOUNT_ID),
        eq(schema.playbackLocalState.queueIdText, DEVICE_PLAYBACK_QUEUE_ID),
        eq(schema.playbackLocalState.resourceKind, ITEM_RESOURCE),
        eq(schema.playbackLocalState.resourceIdText, itemIdText)
      )
    )
    .limit(1);
  const position = rows[0]?.playbackPosition;
  if (position === undefined || !Number.isFinite(position) || position <= 0) {
    return null;
  }
  return position;
};
