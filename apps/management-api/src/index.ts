if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@dotenvx/dotenvx').config({ path: '.env' });
}

import { AppDataSourceRead, AppDataSourceReadWrite } from '@mgmt-api/orm/db';
import { startApp } from './app';
import { validateStartupRequirements } from './lib/startup/validation';

let serverInstance: import('http').Server | null = null;

const shutdown = async (signal?: string) => {
  try {
    console.warn(`Shutdown initiated${signal ? ` due to ${signal}` : ''}`);
    if (serverInstance) {
      await new Promise<void>((resolve, reject) => {
        serverInstance?.close((err) => (err ? reject(err) : resolve()));
      });
      console.warn('HTTP server closed');
    }
    try {
      await AppDataSourceRead.destroy();
      await AppDataSourceReadWrite.destroy();
      console.warn('Database connections closed');
    } catch (err) {
      console.error('Error closing DB connections during shutdown:', err);
    }
  } catch (err) {
    console.error('Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

(async () => {
  try {
    validateStartupRequirements();

    console.warn('Connecting to the management database');
    await AppDataSourceRead.initialize();
    await AppDataSourceReadWrite.initialize();
    console.warn('Connected to the management database');

    const maybeServer = await startApp();
    if (maybeServer) {
      serverInstance = maybeServer;
    }
  } catch (error) {
    // For validation errors, log just the message without stack trace
    if (error instanceof Error && error.message.includes('FATAL:') && error.message.includes('required environment variable')) {
      // Validation error - message already logged in validation.ts, just exit
      process.exit(1);
    } else {
      // Other errors - log with full details
      console.error('Error during application startup:', error);
      process.exit(1);
    }
  }
})();
