import { chunkArray, ONE_DAY_SECONDS } from '@podverse/helpers';

import type { NotificationsContext } from '../../factory.js';
import type { ProviderSendRow } from '../notifications/pushOutcome.js';
import { providerFailure, providerSuccess } from '../notifications/pushOutcome.js';
import type { WebPushSubscription } from './webpushHelpers.js';

type WebPushPayload = {
  title: string;
  body?: string;
  image?: string; // Item/channel artwork for large preview
  link?: string;
  data?: Record<string, unknown>;
};

type WebPushResult = ProviderSendRow;

function readStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return null;
  }
  const statusCode = error.statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Unknown error';
}

export async function sendWebPushNotificationBatch(
  ctx: NotificationsContext,
  subscriptions: WebPushSubscription[],
  payload: WebPushPayload
): Promise<WebPushResult[]> {
  if (!ctx.webpushAdmin) {
    throw new Error('Web Push Admin is not initialized');
  }

  const webpushInstance = ctx.webpushAdmin;
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
              TTL: ONE_DAY_SECONDS,
              urgency: 'normal',
            }
          );
          return providerSuccess(subscription.endpoint);
        } catch (error: unknown) {
          return providerFailure(
            subscription.endpoint,
            readStatusCode(error),
            readErrorMessage(error)
          );
        }
      })
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        allResults.push({
          success: false,
          endpoint: '',
          errorCode: 'send_failed',
          errorMessage: readErrorMessage(result.reason),
        });
      }
    }
  }

  return allResults;
}
