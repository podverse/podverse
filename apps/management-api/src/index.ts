const loadEnv = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const dotenvx = await import('@dotenvx/dotenvx');
    dotenvx.config({ path: '.env' });
  }
};

let serverInstance: import('http').Server | null = null;

const run = async () => {
  await loadEnv();

  const { AppDataSourceRead, AppDataSourceReadWrite } = await import('@mgmt-api/orm/db/index.js');
  const { AppDbDataSourceRead, AppDbDataSourceReadWrite } =
    await import('@mgmt-api/orm/db/appDb.js');
  const { startApp } = await import('./app.js');
  const { validateStartupRequirements } = await import('./lib/startup/validation.js');

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
        if (AppDataSourceRead.isInitialized) {
          await AppDataSourceRead.destroy();
        }
        if (AppDataSourceReadWrite.isInitialized) {
          await AppDataSourceReadWrite.destroy();
        }
        if (AppDbDataSourceRead.isInitialized) {
          await AppDbDataSourceRead.destroy();
        }
        if (AppDbDataSourceReadWrite.isInitialized) {
          await AppDbDataSourceReadWrite.destroy();
        }
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

  try {
    validateStartupRequirements();

    console.warn('Connecting to the management database');
    await AppDataSourceRead.initialize();
    await AppDataSourceReadWrite.initialize();
    console.warn('Connected to the management database');

    console.warn('Connecting to the app database (database console queries)');
    await AppDbDataSourceRead.initialize();
    await AppDbDataSourceReadWrite.initialize();
    console.warn('Connected to the app database');

    const maybeServer = await startApp();
    if (maybeServer) {
      serverInstance = maybeServer;
    }
  } catch (error) {
    // For validation errors, log just the message without stack trace
    if (
      error instanceof Error &&
      error.message.includes('FATAL:') &&
      error.message.includes('required environment variable')
    ) {
      // Validation error - message already logged in validation.ts, just exit
      process.exit(1);
    } else {
      // Other errors - log with full details
      console.error('Error during application startup:', error);
      process.exit(1);
    }
  }
};

void run();
