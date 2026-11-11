import { chunkArray } from '@podverse/helpers';
import { fetchWithTimeout } from '@podverse/helpers-backend';

import type { NotificationsContext } from '../../factory.js';
import type { ProviderSendRow } from '../notifications/pushOutcome.js';
import { providerFailure, providerSuccess } from '../notifications/pushOutcome.js';
import type { UPSubscription } from './unifiedpushHelpers.js';
import { UNIFIED_PUSH_SEND_TIMEOUT_MS } from './unifiedpushHelpers.js';

type UPDataOnlyResult = ProviderSendRow;

/**
 * Sends a UnifiedPush data-only message (X-UnifiedPush: 1) so the distributor delivers to the app
 * without showing a user-facing notification banner.
 */
export async function sendUPDataOnlyBatch(
  _ctx: NotificationsContext,
  subscriptions: UPSubscription[],
  data: Record<string, unknown>
): Promise<UPDataOnlyResult[]> {
  const chunks = chunkArray(subscriptions, 100);
  const allResults: UPDataOnlyResult[] = [];
  const body = JSON.stringify(data);

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(async (subscription) => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-UnifiedPush': '1',
          };

          if (subscription.up_auth_key) {
            headers['Authorization'] = `Bearer ${subscription.up_auth_key}`;
          }

          const response = await fetchWithTimeout(subscription.up_endpoint, {
            body,
            headers,
            method: 'POST',
            timeoutMs: UNIFIED_PUSH_SEND_TIMEOUT_MS,
          });

          if (!response.ok) {
            return providerFailure(
              subscription.up_endpoint,
              response.status,
              `HTTP ${response.status}`
            );
          }

          return providerSuccess(subscription.up_endpoint);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return providerFailure(subscription.up_endpoint, null, errorMessage);
        }
      })
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        allResults.push(providerFailure('', null, 'Promise rejected'));
      }
    }
  }

  return allResults;
}
