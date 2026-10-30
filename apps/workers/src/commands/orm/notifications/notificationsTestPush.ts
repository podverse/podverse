import type { CommandLineArgs } from '@workers/commands/index.js';
import { getNotificationSendContexts } from '@workers/lib/notifications/notificationSendContexts.js';

import { MediumEnum } from '@podverse/helpers';
import { notificationOrchestrator } from '@podverse/notifications';
import {
  AccountFCMDeviceService,
  AccountService,
  AccountUPDeviceService,
  AccountWebPushDeviceService,
} from '@podverse/orm';

import type { PushSendOutcome, TestPushDeviceLine } from './notificationsTestPushLib.js';
import {
  failedOutcome,
  formatDeviceLine,
  formatOutcomeLine,
  isNotificationsTestPushEnabled,
  NOTIFICATIONS_TEST_PUSH_HELP,
  outcomeFromSendResult,
  parseNotificationsTestPushArgs,
  secretSuffix,
} from './notificationsTestPushLib.js';

const TEST_TITLE = 'Podverse test push';
const TEST_BODY = 'Alpha test push. If you can read this, delivery reached this device.';

type FirebasePlatform = 'web' | 'android' | 'ios';

type TestPushTarget = TestPushDeviceLine & {
  firebaseToken: string | null;
  webPush: { endpoint: string; p256dh: string; auth: string } | null;
  unifiedPush: { up_endpoint: string; up_auth_key: string | null } | null;
};

function isFirebasePlatform(value: string): value is FirebasePlatform {
  return value === 'web' || value === 'android' || value === 'ios';
}

function writeLine(line: string): void {
  process.stdout.write(`${line}\n`);
}

/**
 * Lists or sends a visible test push for one account. The process refuses unless
 * NOTIFICATIONS_TEST_PUSH_ENABLED is the string true. A send skips subscription and
 * preference checks and does not insert an inbox row.
 */
export const notificationsTestPush = async (args: CommandLineArgs): Promise<void> => {
  const parsed = parseNotificationsTestPushArgs(args);
  if (parsed.kind === 'invalid') {
    throw new Error(parsed.message);
  }
  if (parsed.kind === 'help') {
    process.stdout.write(NOTIFICATIONS_TEST_PUSH_HELP);
    return;
  }

  if (!isNotificationsTestPushEnabled(process.env.NOTIFICATIONS_TEST_PUSH_ENABLED)) {
    throw new Error('NOTIFICATIONS_TEST_PUSH_ENABLED must be the string true');
  }

  const account = await new AccountService().getByUsername(parsed.username);
  if (account === null) {
    throw new Error(`notificationsTestPush: no account for username ${parsed.username}`);
  }

  const targets = await loadTargets(account.id, parsed.installationId);
  writeLine(`account_id=${account.id} devices=${targets.length}`);
  if (targets.length === 0) {
    throw new Error(
      parsed.installationId === null
        ? 'notificationsTestPush: no devices registered'
        : 'notificationsTestPush: no device with that installation id'
    );
  }

  if (parsed.kind === 'list') {
    for (const target of targets) {
      writeLine(formatDeviceLine(target));
    }
    return;
  }

  const contexts = getNotificationSendContexts();
  let failed = 0;
  for (const target of targets) {
    const outcome = await sendOne(contexts, target);
    if (!outcome.success) {
      failed += 1;
    }
    writeLine(`${formatDeviceLine(target)} ${formatOutcomeLine(outcome)}`);
  }

  writeLine(`notificationsTestPush completed accepted=${targets.length - failed} failed=${failed}`);
  if (failed > 0) {
    throw new Error(`notificationsTestPush: ${failed} of ${targets.length} sends failed`);
  }
};

async function loadTargets(
  accountId: number,
  installationId: string | null
): Promise<TestPushTarget[]> {
  const fcmDevices = await new AccountFCMDeviceService().getAllForAccount(accountId);
  const targets: TestPushTarget[] = [];

  for (const device of fcmDevices) {
    if (installationId !== null && device.installation_id !== installationId) {
      continue;
    }
    targets.push({
      service: 'firebase',
      platform: device.platform,
      installationId: device.installation_id,
      secretSuffix: secretSuffix(device.fcm_token),
      locale: device.locale,
      firebaseToken: device.fcm_token,
      webPush: null,
      unifiedPush: null,
    });
  }

  if (installationId !== null) {
    return targets;
  }

  const webDevices = await new AccountWebPushDeviceService().getAllForAccount(accountId);
  for (const device of webDevices) {
    targets.push({
      service: 'webpush',
      platform: null,
      installationId: null,
      secretSuffix: secretSuffix(device.endpoint),
      locale: device.locale,
      firebaseToken: null,
      webPush: { endpoint: device.endpoint, p256dh: device.p256dh, auth: device.auth },
      unifiedPush: null,
    });
  }

  const upDevice = await new AccountUPDeviceService().getForAccount(accountId);
  if (upDevice !== null) {
    targets.push({
      service: 'unifiedpush',
      platform: null,
      installationId: null,
      secretSuffix: secretSuffix(upDevice.up_endpoint),
      locale: upDevice.locale,
      firebaseToken: null,
      webPush: null,
      unifiedPush: { up_endpoint: upDevice.up_endpoint, up_auth_key: upDevice.up_auth_key },
    });
  }

  return targets;
}

async function sendOne(
  contexts: ReturnType<typeof getNotificationSendContexts>,
  target: TestPushTarget
): Promise<PushSendOutcome> {
  if (target.service === 'firebase') {
    if (contexts.firebase.firebaseMessaging === null || target.firebaseToken === null) {
      return failedOutcome('firebase_not_initialized', 'Firebase Admin is not initialized');
    }
    if (target.platform === null || !isFirebasePlatform(target.platform)) {
      return failedOutcome('unsupported_platform', 'FCM platform is not web, android, or ios');
    }
    try {
      const result = await notificationOrchestrator(contexts.notifications, {
        service: 'firebase',
        firebaseCtx: contexts.firebase,
        tokens: [target.firebaseToken],
        platform: target.platform,
        messageText: TEST_TITLE,
        messageType: 'new',
        locale: target.locale,
        body: TEST_BODY,
        mediumId: MediumEnum.Podcast,
        data: { testPush: 'true' },
      });
      return outcomeFromSendResult('firebase', result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed';
      return failedOutcome('send_threw', message);
    }
  }

  if (target.service === 'webpush') {
    if (contexts.notifications.webpushAdmin === null || target.webPush === null) {
      return failedOutcome('webpush_not_initialized', 'Web Push Admin is not initialized');
    }
    try {
      const result = await notificationOrchestrator(contexts.notifications, {
        service: 'webpush',
        subscriptions: [
          {
            endpoint: target.webPush.endpoint,
            keys: { p256dh: target.webPush.p256dh, auth: target.webPush.auth },
          },
        ],
        messageText: TEST_TITLE,
        messageType: 'new',
        locale: target.locale,
        body: TEST_BODY,
        mediumId: MediumEnum.Podcast,
        data: { testPush: 'true' },
      });
      return outcomeFromSendResult('webpush', result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed';
      return failedOutcome('send_threw', message);
    }
  }

  if (target.unifiedPush === null) {
    return failedOutcome('missing_subscription', 'UnifiedPush endpoint is missing');
  }

  try {
    const result = await notificationOrchestrator(contexts.notifications, {
      service: 'unifiedpush',
      subscriptions: [target.unifiedPush],
      messageText: TEST_TITLE,
      messageType: 'new',
      locale: target.locale,
      body: TEST_BODY,
      mediumId: MediumEnum.Podcast,
      data: { testPush: 'true' },
    });
    return outcomeFromSendResult('unifiedpush', result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send failed';
    return failedOutcome('send_threw', message);
  }
}
