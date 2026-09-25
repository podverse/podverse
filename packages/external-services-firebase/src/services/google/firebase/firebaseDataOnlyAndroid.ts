import { chunkArray, stringifyData } from '@podverse/helpers';

import type { FirebaseContext } from '../../../factory.js';

/**
 * Android data-only high-priority FCM message (no notification payload), so the app can wake and
 * evaluate auto downloads without a user-visible banner.
 */
export async function sendFirebaseDataOnlyBatchAndroid(
  ctx: FirebaseContext,
  tokens: string[],
  data: Record<string, unknown>
) {
  if (!ctx.firebaseMessaging) {
    throw new Error('Firebase Admin is not initialized');
  }

  const chunks = chunkArray(tokens, 500);
  const results: unknown[] = [];

  for (const chunk of chunks) {
    const multicastMessage = {
      tokens: chunk,
      android: {
        priority: 'high' as const,
      },
      data: stringifyData(data),
    };

    try {
      const resp = await ctx.firebaseMessaging.sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error('sendFirebaseDataOnlyBatchAndroid chunk error:', err);
      throw err;
    }
  }

  return results;
}
