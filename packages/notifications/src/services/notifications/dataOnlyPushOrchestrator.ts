import {
  type FirebaseContext,
  firebaseDataOnlyBatchOrchestrator,
} from '@podverse/external-services-firebase';

import type { NotificationsContext } from '../../factory.js';
import type { UPSubscription } from '../unifiedpush/index.js';
import { sendUPDataOnlyBatch } from '../unifiedpush/unifiedpushDataOnly.js';

export type DataOnlyPlatform = 'android' | 'ios';

type FirebaseDataOnlyParams = {
  service: 'firebase';
  firebaseCtx: FirebaseContext;
  tokens: string[];
  platform: DataOnlyPlatform;
  data: Record<string, unknown>;
};

type UnifiedPushDataOnlyParams = {
  service: 'unifiedpush';
  subscriptions: UPSubscription[];
  data: Record<string, unknown>;
};

export type DataOnlyOrchestratorParams = FirebaseDataOnlyParams | UnifiedPushDataOnlyParams;

/**
 * Sends a data-only (silent) push so a backgrounded or suspended app can wake and evaluate
 * auto downloads. Does not create an in-app notification or show a banner.
 */
export async function dataOnlyPushOrchestrator(
  ctx: NotificationsContext,
  params: DataOnlyOrchestratorParams
) {
  switch (params.service) {
    case 'firebase':
      return await firebaseDataOnlyBatchOrchestrator(params.firebaseCtx, {
        tokens: params.tokens,
        platform: params.platform,
        data: params.data,
      });
    case 'unifiedpush':
      return await sendUPDataOnlyBatch(ctx, params.subscriptions, params.data);
    default:
      throw new Error('Unsupported data-only push service');
  }
}
