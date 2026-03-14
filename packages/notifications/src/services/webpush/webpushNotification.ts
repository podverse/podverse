import type webpush from 'web-push';

import { chunkArray } from '@podverse/helpers';

import type { NotificationsContext } from '../../factory.js';
import type { WebPushSubscription } from './webpushHelpers.js';

type WebPushPayload = {
  title: string;
  body?: string;
  image?: string; // Item/channel artwork for large preview
  link?: string;
  data?: Record<string, unknown>;
};

type WebPushResult = {
  success: boolean;
  endpoint: string;
  error?: string;
};

export async function sendWebPushNotificationBatch(
  ctx: NotificationsContext,
  subscriptions: WebPushSubscription[],
  payload: WebPushPayload
): Promise<WebPushResult[]> {
  if (!ctx.webpushAdmin) {
    throw new Error('Web Push Admin is not initialized');
  }

  const webpushInstance = ctx.webpushAdmin as typeof webpush;
  const chunks = chunkArray(subscriptions, 100);
  const allResults: WebPushResult[] = [];

  for (const chunk of chunks) {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      icon: ctx.getWebIconImageUrl(), // Always use app icon for branding
      image: payload.image, // Item/channel artwork
      link: payload.link ? ctx.getWebBaseUrlWithPath(payload.link) : ctx.getWebBaseUrl(),
      data: payload.data,
    });

    const chunkResults = await Promise.allSettled(
      chunk.map(async (subscription) => {
        try {
          await webpushInstance.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            notificationPayload,
            {
              TTL: 86400, // 24 hours
              urgency: 'normal',
            }
          );
          return { success: true, endpoint: subscription.endpoint };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.error(`Web Push send failed for ${subscription.endpoint}:`, error.message);
          return {
            success: false,
            endpoint: subscription.endpoint,
            error: error.message || 'Unknown error',
          };
        }
      })
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        allResults.push({
          success: false,
          endpoint: 'unknown',
          error: result.reason?.message || 'Promise rejected',
        });
      }
    }
  }

  return allResults;
}
