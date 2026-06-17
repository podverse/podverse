import type { MulticastMessage } from 'firebase-admin/messaging';

import { chunkArray, stringifyData } from '@podverse/helpers';

import type { FirebaseContext } from '../../../factory.js';

type IOSPayload = {
  fcmToken: string;
  title: string;
  body?: string;
  badge?: number;
  sound?: string;
  image?: string;
  data?: Record<string, unknown>;
};

export async function sendFirebaseNotificationBatchIOS(
  ctx: FirebaseContext,
  tokens: string[],
  payload: Omit<IOSPayload, 'fcmToken'>
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
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            alert: { title: payload.title, body: payload.body },
            badge: payload.badge,
            sound: payload.sound || 'default',
            'mutable-content': 1,
          },
          ...(payload.data || {}),
          image: payload.image || ctx.getWebIconImageUrl(),
        },
      },
      data: stringifyData(payload.data),
    };

    try {
      const resp = await ctx.firebaseMessaging.sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error('sendFirebaseNotificationBatchIOS chunk error:', err);
      throw err;
    }
  }

  return results;
}
