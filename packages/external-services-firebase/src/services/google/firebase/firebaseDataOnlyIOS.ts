import type { MulticastMessage } from 'firebase-admin/messaging';

import { chunkArray, stringifyData } from '@podverse/helpers';

import type { FirebaseContext } from '../../../factory.js';

/**
 * iOS silent / background push: content-available with no alert, so the OS can wake the app
 * without showing a banner. Priority 5 is the APNs background priority.
 */
export async function sendFirebaseDataOnlyBatchIOS(
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
    const multicastMessage: MulticastMessage = {
      tokens: chunk,
      apns: {
        headers: {
          'apns-priority': '5',
          'apns-push-type': 'background',
        },
        payload: {
          aps: {
            'content-available': 1,
          },
        },
      },
      data: stringifyData(data),
    };

    try {
      const resp = await ctx.firebaseMessaging.sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error('sendFirebaseDataOnlyBatchIOS chunk error:', err);
      throw err;
    }
  }

  return results;
}
