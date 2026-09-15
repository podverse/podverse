import {
  type FirebaseContext,
  firebaseNotificationBatchOrchestrator,
} from '@podverse/external-services-firebase';
import { buildNotificationLinkPath, isNotificationLinkMessageType } from '@podverse/helpers';

import type { NotificationsContext } from '../../factory.js';
import type { UPSubscription } from '../unifiedpush/index.js';
import { unifiedpushNotificationBatchOrchestrator } from '../unifiedpush/index.js';
import type { WebPushSubscription } from '../webpush/index.js';
import { webpushNotificationBatchOrchestrator } from '../webpush/index.js';
import type { NotificationMessageType } from './i18nNotifications.js';
import { i18nNotifications } from './i18nNotifications.js';

export type NotificationPlatform = 'web' | 'android' | 'ios';
export type NotificationService = 'firebase' | 'webpush' | 'unifiedpush';

// Base params common to all services
type BaseNotificationOrchestratorParams = {
  messageText: string;
  messageType: NotificationMessageType;
  locale: string;
  body?: string; // Secondary text (e.g., channel title)
  image?: string; // Item/channel artwork for large preview
  linkIdText?: string;
  channelIdText?: string;
  mediumId: number; // For constructing medium-specific links (e.g., /podcast/livestream vs /music/livestream)
  data?: Record<string, unknown>;
};

// Firebase-specific params
type FirebaseNotificationOrchestratorParams = BaseNotificationOrchestratorParams & {
  service: 'firebase';
  firebaseCtx: FirebaseContext;
  tokens: string[];
  platform: NotificationPlatform;
  channelId?: string;
  badge?: number;
  sound?: string;
};

// WebPush-specific params
type WebPushNotificationOrchestratorParams = BaseNotificationOrchestratorParams & {
  service: 'webpush';
  subscriptions: WebPushSubscription[];
};

// UnifiedPush-specific params
type UnifiedPushNotificationOrchestratorParams = BaseNotificationOrchestratorParams & {
  service: 'unifiedpush';
  subscriptions: UPSubscription[];
};

export type NotificationOrchestratorParams =
  | FirebaseNotificationOrchestratorParams
  | WebPushNotificationOrchestratorParams
  | UnifiedPushNotificationOrchestratorParams;

function getFinalText(messageText: string, messageType: NotificationMessageType, locale: string) {
  const baseLocale = locale.includes('-') ? (locale.split('-')[0] ?? locale) : locale;
  const localeMap =
    i18nNotifications[locale] ?? i18nNotifications[baseLocale] ?? i18nNotifications.en;
  const enMap = i18nNotifications.en;
  const prefix =
    (localeMap ? localeMap[messageType] : undefined) ?? (enMap ? enMap[messageType] : '') ?? '';
  return `${prefix}${messageText}`;
}

export async function notificationOrchestrator(
  ctx: NotificationsContext,
  params: NotificationOrchestratorParams
) {
  const {
    service,
    messageText,
    messageType,
    locale,
    body,
    linkIdText,
    channelIdText,
    mediumId,
    image,
    data,
  } = params;
  const finalText = getFinalText(messageText, messageType, locale);

  const link = isNotificationLinkMessageType(messageType)
    ? (buildNotificationLinkPath({
        channelIdText: channelIdText ?? '',
        itemIdText: linkIdText ?? '',
        mediumId,
        messageType,
      }) ?? undefined)
    : undefined;

  const payloadData: Record<string, unknown> = {
    ...(data ?? {}),
    ...(channelIdText !== undefined ? { channelIdText } : {}),
    ...(linkIdText !== undefined ? { itemIdText: linkIdText } : {}),
    type: messageType,
    ...(link !== undefined ? { link_path: link } : {}),
  };

  switch (service) {
    case 'firebase': {
      const firebaseParams = params as FirebaseNotificationOrchestratorParams;
      return await firebaseNotificationBatchOrchestrator(firebaseParams.firebaseCtx, {
        tokens: firebaseParams.tokens,
        platform: firebaseParams.platform,
        finalText,
        ...(body !== undefined ? { body } : {}),
        ...(link !== undefined ? { link } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(firebaseParams.channelId !== undefined ? { channelId: firebaseParams.channelId } : {}),
        ...(firebaseParams.badge !== undefined ? { badge: firebaseParams.badge } : {}),
        ...(firebaseParams.sound !== undefined ? { sound: firebaseParams.sound } : {}),
        data: payloadData,
      });
    }

    case 'webpush': {
      const webpushParams = params as WebPushNotificationOrchestratorParams;
      return await webpushNotificationBatchOrchestrator(ctx, {
        subscriptions: webpushParams.subscriptions,
        finalText,
        ...(body !== undefined ? { body } : {}),
        ...(link !== undefined ? { link } : {}),
        ...(image !== undefined ? { image } : {}),
        data: payloadData,
      });
    }

    case 'unifiedpush': {
      const upParams = params as UnifiedPushNotificationOrchestratorParams;
      return await unifiedpushNotificationBatchOrchestrator(ctx, {
        subscriptions: upParams.subscriptions,
        finalText,
        ...(body !== undefined ? { body } : {}),
        ...(link !== undefined ? { link } : {}),
        ...(image !== undefined ? { image } : {}),
        data: payloadData,
      });
    }

    default:
      throw new Error(`Unsupported notification service: ${service}`);
  }
}
