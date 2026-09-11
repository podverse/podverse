/* eslint-disable @typescript-eslint/no-explicit-any */

import { shutdownObservability } from '@podverse/observability';

type LoggerLike = {
  info?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
  log?: (...args: any[]) => void;
};

export const createActiveMQShutdown = (
  activeMQService: { close: () => Promise<void> },
  logger: LoggerLike = console,
  onShutdown?: () => void | Promise<void>,
  exitOnShutdown = true
) => {
  const shutdown = async (signal?: string) => {
    try {
      if (onShutdown) {
        await onShutdown();
      }
      logger.info?.(`Shutting down${signal ? ` due to ${signal}` : ''}`);
    } catch {
      // ignore errors from onShutdown
    }

    try {
      await shutdownObservability();
    } catch (err) {
      logger.error?.('Error during observability shutdown', err as Error);
    }

    try {
      await activeMQService.close();
      logger.info?.('ActiveMQ Artemis connection closed');
    } catch (err) {
      logger.error?.('Error during Artemis shutdown', err as Error);
    }

    if (exitOnShutdown) {
      process.exit(0);
    }
  };

  const handler = (sig: string) => void shutdown(sig);

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);

  return {
    shutdown,
    unregister: () => {
      process.removeListener('SIGINT', handler);
      process.removeListener('SIGTERM', handler);
    },
  };
};
