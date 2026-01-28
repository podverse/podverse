import { stringifyData, chunkArray } from '@podverse/helpers';
import { FirebaseContext } from '../../../factory';

type AndroidPayload = {
  fcmToken: string;
  title: string;
  body?: string;
  channelId?: string;
  image?: string;
  data?: Record<string, unknown>;
};

export async function sendFirebaseNotificationBatchAndroid(
  ctx: FirebaseContext,
  tokens: string[],
  payload: Omit<AndroidPayload, 'fcmToken'>
) {
  if (!ctx.firebaseAdmin) {
    throw new Error('Firebase Admin is not initialized');
  }

  const chunks = chunkArray(tokens, 500);
  const results: unknown[] = [];

  for (const chunk of chunks) {
    const multicastMessage = {
      tokens: chunk,
      android: {
        priority: 'high' as const,
        notification: {
          title: payload.title,
          body: payload.body ?? '',
          channelId: payload.channelId ?? 'default',
          image: payload.image ?? ctx.getWebIconImageUrl(),
        },
      },
      data: stringifyData(payload.data),
    };

    try {
      const resp = await ctx.firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);
      results.push(resp);
    } catch (err) {
      console.error('sendFirebaseNotificationBatchAndroid chunk error:', err);
      throw err;
    }
  }

  return results;
}
