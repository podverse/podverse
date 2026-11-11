import { loggerService } from '@parser/factories/loggerService.js';

import { recordPushSend } from '@podverse/extension-metrics-sdk';
import type { PushErrorClass, PushOutcome } from '@podverse/notifications';
import { classifyPushErrorCode } from '@podverse/notifications';
import {
  AccountFCMDeviceService,
  AccountUPDeviceService,
  AccountWebPushDeviceService,
} from '@podverse/orm';

const SHRUNK_IMAGE = /-w\d+-c[0-9a-f]+\.[a-z0-9]+$/i;

export function describePushImage(url: string | null): string {
  if (url === null || url.trim() === '') {
    return 'none';
  }
  const withoutQuery = url.split('?')[0] ?? url;
  const path = withoutQuery.split('#')[0] ?? withoutQuery;
  const file = path.slice(path.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  const extension = dot === -1 ? 'unknown' : file.slice(dot + 1).toLowerCase();
  const kind = SHRUNK_IMAGE.test(file) ? 'shrunk' : 'original';
  return `${kind}-${extension}`;
}

export function failedCountByClass(outcome: PushOutcome): Record<PushErrorClass, number> {
  const counts: Record<PushErrorClass, number> = {
    dead_token: 0,
    transient: 0,
    payload_or_auth: 0,
  };
  for (const [code, count] of Object.entries(outcome.byCode)) {
    counts[classifyPushErrorCode(code)] += count;
  }
  return counts;
}

export function pushSendLogLevel(outcome: PushOutcome): 'info' | 'warn' | 'error' {
  if (outcome.failed === 0) {
    return 'info';
  }
  if (failedCountByClass(outcome).payload_or_auth > 0) {
    return 'error';
  }
  return 'warn';
}

async function removeDeadTargets(outcome: PushOutcome): Promise<void> {
  if (outcome.deadTargets.length === 0) {
    return;
  }
  try {
    let removed = 0;
    if (outcome.service === 'firebase') {
      removed = await new AccountFCMDeviceService().deleteByTokens(outcome.deadTargets);
    } else if (outcome.service === 'webpush') {
      removed = await new AccountWebPushDeviceService().deleteByEndpoints(outcome.deadTargets);
    } else {
      removed = await new AccountUPDeviceService().deleteByEndpoints(outcome.deadTargets);
    }
    loggerService.info('Removed dead push targets', {
      service: outcome.service,
      count: removed,
    });
  } catch (error) {
    loggerService.logError('Could not remove dead push targets', error);
  }
}

export async function reportPushOutcome(input: {
  outcome: PushOutcome;
  locale: string | null;
  itemIdText: string | null;
  channelIdText: string | null;
  messageType: string;
  imageUrl: string | null;
}): Promise<void> {
  const { outcome } = input;
  const failedByClass = failedCountByClass(outcome);
  const level = pushSendLogLevel(outcome);
  const meta = {
    service: outcome.service,
    platform: outcome.platform,
    locale: input.locale,
    itemIdText: input.itemIdText,
    channelIdText: input.channelIdText,
    messageType: input.messageType,
    accepted: outcome.accepted,
    failed: outcome.failed,
    byCode: outcome.byCode,
    image: describePushImage(input.imageUrl),
    ...(level === 'error' ? { sampleMessageByCode: outcome.sampleMessageByCode } : {}),
  };

  if (level === 'error') {
    loggerService.error('Push send result', meta);
  } else if (level === 'warn') {
    loggerService.warn('Push send result', meta);
  } else {
    loggerService.info('Push send result', meta);
  }

  recordPushSend({
    service: outcome.service,
    platform: outcome.platform,
    accepted: outcome.accepted,
    failedByClass,
  });
  await removeDeadTargets(outcome);
}
