import { stringifyData, chunkArray } from '@podverse/helpers';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { FirebaseContext } from '../../../factory';

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
  if (!ctx.firebaseAdmin) {
    throw new Error('Firebase Admin is not initialized');
  }

  const chunks = chunkArray(tokens, 500);
  const results: unknown[] = [];

  for (const chunk of chunks) {
    const multicastMessage = {
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
      const resp = await ctx.firebaseAdmin
        .messaging()
        .sendEachForMulticast(multicastMessage as MulticastMessage);
      results.push(resp);
    } catch (err) {
      console.error('sendFirebaseNotificationBatchIOS chunk error:', err);
      throw err;
    }
  }

  return results;
}
