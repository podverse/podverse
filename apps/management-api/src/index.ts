const loadEnv = async () => {
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.PODVERSE_SKIP_DOTENV === 'true') {
      return;
    }
    const dotenvx = await import('@dotenvx/dotenvx');
    dotenvx.config({ path: '.env' });
  }
};

let serverInstance: import('http').Server | null = null;

const run = async () => {
  await loadEnv();

  const { AppDataSourceRead, AppDataSourceReadWrite } =
    await import('@management-api/orm/db/index.js');
  const { AppDbDataSourceRead, AppDbDataSourceReadWrite } =
    await import('@management-api/orm/db/appDb.js');
  const { validateStartupRequirements } = await import('./lib/startup/validation.js');

  validateStartupRequirements();

  const { config } = await import('./config/index.js');
  const { initObservability, shutdownObservability } = await import('@podverse/observability');
  initObservability(config.observability);

  const { loggerService } = await import('./factories/loggerService.js');

  const shutdown = async (signal?: string) => {
    try {
      loggerService.warn(`Shutdown initiated${signal ? ` due to ${signal}` : ''}`);
      if (serverInstance) {
        await new Promise<void>((resolve, reject) => {
          serverInstance?.close((err) => (err ? reject(err) : resolve()));
        });
        loggerService.warn('HTTP server closed');
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
        loggerService.warn('Database connections closed');
      } catch (err) {
        loggerService.logError('Error closing DB connections during shutdown', err);
      }
      try {
        const { shutdownManagementApiExtensions } =
          await import('./lib/extensions/bootstrapExtensions.js');
        await shutdownManagementApiExtensions();
      } catch (err) {
        loggerService.logError('Error shutting down extensions during shutdown', err);
      }
      try {
        await shutdownObservability();
      } catch (err) {
        loggerService.logError('Error shutting down observability during shutdown', err);
      }
    } catch (err) {
      loggerService.logError('Error during shutdown', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    loggerService.warn('Connecting to the management database');
    await AppDataSourceRead.initialize();
    await AppDataSourceReadWrite.initialize();
    loggerService.warn('Connected to the management database');

    loggerService.warn('Connecting to the app database (database console queries)');
    await AppDbDataSourceRead.initialize();
    await AppDbDataSourceReadWrite.initialize();
    loggerService.warn('Connected to the app database');

    const { bindORMContext } = await import('@podverse/orm');
    bindORMContext({
      config: {
        nodeEnv: config.nodeEnv,
        database: {
          host: config.appDatabase.host,
          port: config.appDatabase.port,
          read_username: config.appDatabase.read_username,
          read_password: config.appDatabase.read_password,
          read_write_username: config.appDatabase.read_write_username,
          read_write_password: config.appDatabase.read_write_password,
          database: config.appDatabase.database,
          ssl_connection: config.appDatabase.ssl_connection,
        },
        log: {
          level: config.log.level,
          dir: config.log.dir,
        },
        defaults: {
          account: {
            settings: {
              locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
            },
          },
        },
      },
      dataSourceRead: AppDbDataSourceRead,
      dataSourceReadWrite: AppDbDataSourceReadWrite,
      loggerService,
    });

    const { startApp } = await import('./app.js');
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
      loggerService.logError('Error during application startup', error);
      process.exit(1);
    }
  }
};

void run();
