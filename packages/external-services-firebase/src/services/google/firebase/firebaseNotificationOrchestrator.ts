import type { FirebaseContext } from '../../../factory.js';
import { sendFirebaseNotificationBatchWeb } from './firebaseNotificationWeb.js';
import { sendFirebaseNotificationBatchAndroid } from './firebaseNotificationAndroid.js';
import { sendFirebaseNotificationBatchIOS } from './firebaseNotificationIOS.js';

type NotificationPlatform = 'web' | 'android' | 'ios';

type OrchestratorParams = {
  tokens: string[];
  finalText: string;
  platform: NotificationPlatform;
  // spread of any platform-specific options
  body?: string; // Secondary text (e.g., channel title)
  image?: string; // Item/channel artwork for large preview
  link?: string;
  channelId?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, unknown>;
};

export async function firebaseNotificationBatchOrchestrator(
  ctx: FirebaseContext,
  params: OrchestratorParams
) {
  const { tokens, finalText, platform } = params;

  switch (platform) {
    case 'web': {
      const payload = {
        title: finalText,
        ...(params.body !== undefined ? { body: params.body } : {}),
        ...(params.image !== undefined ? { image: params.image } : {}),
        ...(params.link !== undefined ? { link: params.link } : {}),
        ...(params.data !== undefined ? { data: params.data as Record<string, string> } : {}),
      };
      return await sendFirebaseNotificationBatchWeb(ctx, tokens, payload);
    }

    case 'android': {
      const payload = {
        title: finalText,
        ...(params.body !== undefined ? { body: params.body } : {}),
        ...(params.image !== undefined ? { image: params.image } : {}),
        ...(params.channelId !== undefined ? { channelId: params.channelId } : {}),
        ...(params.data !== undefined ? { data: params.data } : {}),
      };
      return await sendFirebaseNotificationBatchAndroid(ctx, tokens, payload);
    }

    case 'ios': {
      const payload = {
        title: finalText,
        ...(params.body !== undefined ? { body: params.body } : {}),
        ...(params.image !== undefined ? { image: params.image } : {}),
        ...(params.badge !== undefined ? { badge: params.badge } : {}),
        ...(params.sound !== undefined ? { sound: params.sound } : {}),
        ...(params.data !== undefined ? { data: params.data } : {}),
      };
      return await sendFirebaseNotificationBatchIOS(ctx, tokens, payload);
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
