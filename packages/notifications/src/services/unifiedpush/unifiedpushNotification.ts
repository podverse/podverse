import { chunkArray } from '@podverse/helpers';
import { fetchWithTimeout } from '@podverse/helpers-backend';
import type { NotificationsContext } from '../../factory.js';
import type { UPSubscription } from './unifiedpushHelpers.js';

type UPPayload = {
  title: string;
  body?: string;
  image?: string; // Item/channel artwork for X-Attach
  link?: string;
  data?: Record<string, unknown>;
};

type UPResult = {
  success: boolean;
  endpoint: string;
  error?: string;
};

/**
 * Sends a notification to a Unified Push endpoint.
 *
 * Unified Push is a simple protocol - just POST the notification data to the endpoint.
 * The endpoint is typically a service like ntfy.sh that the user has configured.
 *
 * @see https://unifiedpush.org/spec/android/
 */
export async function sendUPNotificationBatch(
  ctx: NotificationsContext,
  subscriptions: UPSubscription[],
  payload: UPPayload
): Promise<UPResult[]> {
  const chunks = chunkArray(subscriptions, 100);
  const allResults: UPResult[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(async (subscription) => {
        try {
          // Use ntfy header-based format for proper notification display
          // @see https://docs.ntfy.sh/publish/#publish-as-json
          const headers: Record<string, string> = {
            'Content-Type': 'text/plain',
            'X-Title': payload.title,
            'X-Tags': ctx.config.brandName,
            'X-Click': payload.link ? ctx.getWebBaseUrlWithPath(payload.link) : ctx.getWebBaseUrl(),
            'X-Icon': ctx.getWebIconImageUrl(), // Always use app icon for branding
          };

          // Add item/channel artwork as image attachment for preview
          if (payload.image) {
            headers['X-Attach'] = payload.image;
          }

          // Add authorization if auth key is provided
          if (subscription.up_auth_key) {
            headers['Authorization'] = `Bearer ${subscription.up_auth_key}`;
          }

          // Message body is sent as plain text
          const messageBody = payload.body || '';

          const response = await fetchWithTimeout(subscription.up_endpoint, {
            body: messageBody,
            headers,
            method: 'POST',
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(
              `UP send failed for ${subscription.up_endpoint}: ${response.status} - ${errorText}`
            );
            return {
              success: false,
              endpoint: subscription.up_endpoint,
              error: `HTTP ${response.status}: ${errorText}`,
            };
          }

          return { success: true, endpoint: subscription.up_endpoint };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`UP send failed for ${subscription.up_endpoint}:`, errorMessage);
          return {
            success: false,
            endpoint: subscription.up_endpoint,
            error: errorMessage,
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
