import type { NotificationsContext } from '../../factory.js';
import { sendWebPushNotificationBatch } from './webpushNotification.js';
import type { WebPushSubscription } from './webpushHelpers.js';

type WebPushOrchestratorParams = {
  subscriptions: WebPushSubscription[];
  finalText: string;
  body?: string; // Secondary text (e.g., channel title)
  image?: string; // Item/channel artwork for large preview
  link?: string;
  data?: Record<string, unknown>;
};

export async function webpushNotificationBatchOrchestrator(
  ctx: NotificationsContext,
  params: WebPushOrchestratorParams
) {
  const { subscriptions, finalText, body, image, link, data } = params;

  const payload = {
    title: finalText,
    ...(body !== undefined ? { body } : {}),
    ...(image !== undefined ? { image } : {}),
    ...(link !== undefined ? { link } : {}),
    ...(data !== undefined ? { data } : {}),
  };

  console.warn(
    `[webpushNotificationBatchOrchestrator] Sending to ${subscriptions.length} subscriptions`
  );

  return await sendWebPushNotificationBatch(ctx, subscriptions, payload);
}
