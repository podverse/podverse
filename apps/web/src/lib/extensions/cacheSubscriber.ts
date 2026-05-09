import { subscribeToExtensionInvalidations } from '@podverse/orm';

import {
  closeExtensionKeyvalClients,
  getExtensionRedisSubscriberClient,
  toExtensionCacheClient,
} from './keyvalClient';
import { clearExtensionRowMemo } from './resolveActiveExtensions';

import 'server-only';

let subscriberStarted = false;
let shutdownHooksRegistered = false;

function registerShutdownHooks(): void {
  if (shutdownHooksRegistered) {
    return;
  }

  shutdownHooksRegistered = true;

  const cleanup = (): void => {
    void closeExtensionKeyvalClients();
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
  process.once('exit', cleanup);
}

export async function ensureExtensionCacheSubscriberStarted(): Promise<void> {
  if (subscriberStarted || process.env.EXTENSIONS_ENABLED !== 'true') {
    return;
  }

  const subscriber = getExtensionRedisSubscriberClient();
  if (subscriber === null) {
    return;
  }

  subscriberStarted = true;
  registerShutdownHooks();

  await subscribeToExtensionInvalidations(
    toExtensionCacheClient(subscriber),
    async (id: string) => {
      clearExtensionRowMemo(id);
    }
  );
}
