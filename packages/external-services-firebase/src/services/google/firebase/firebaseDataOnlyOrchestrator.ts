import type { FirebaseContext } from '../../../factory.js';
import { sendFirebaseDataOnlyBatchAndroid } from './firebaseDataOnlyAndroid.js';
import { sendFirebaseDataOnlyBatchIOS } from './firebaseDataOnlyIOS.js';

type DataOnlyPlatform = 'android' | 'ios';

type DataOnlyOrchestratorParams = {
  tokens: string[];
  platform: DataOnlyPlatform;
  data: Record<string, unknown>;
};

/**
 * Sends data-only FCM messages (no visible notification) so a suspended app can wake and run
 * auto-download evaluation.
 */
export async function firebaseDataOnlyBatchOrchestrator(
  ctx: FirebaseContext,
  params: DataOnlyOrchestratorParams
) {
  const { tokens, platform, data } = params;

  switch (platform) {
    case 'android':
      return await sendFirebaseDataOnlyBatchAndroid(ctx, tokens, data);
    case 'ios':
      return await sendFirebaseDataOnlyBatchIOS(ctx, tokens, data);
    default:
      throw new Error(`Unsupported data-only platform: ${platform}`);
  }
}
