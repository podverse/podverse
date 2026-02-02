import type { NotificationsContext } from '../../factory.js';
import { sendUPNotificationBatch } from './unifiedpushNotification.js';
import type { UPSubscription } from './unifiedpushHelpers.js';

type UPOrchestratorParams = {
  subscriptions: UPSubscription[];
  finalText: string;
  body?: string; // Secondary text (e.g., channel title)
  image?: string; // Item/channel artwork for X-Attach
  link?: string;
  data?: Record<string, unknown>;
};

export async function unifiedpushNotificationBatchOrchestrator(
  ctx: NotificationsContext,
  params: UPOrchestratorParams
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
    `[unifiedpushNotificationBatchOrchestrator] Sending to ${subscriptions.length} subscriptions`
  );

  return await sendUPNotificationBatch(ctx, subscriptions, payload);
}
