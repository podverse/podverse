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

  const { loggerService } = await import('./factories/loggerService.js');
  const { validateStartupRequirements } = await import('./lib/startup/validation.js');

  validateStartupRequirements();

  const { config } = await import('./config/index.js');
  const { initObservability, shutdownObservability } = await import('@podverse/observability');
  initObservability(config.observability);

  const {
    validateORMConfig,
    validateNotificationsConfig,
    validateExternalServicesConfig,
    validateParserConfig,
    assertConfigValid,
  } = await import('@podverse/helpers-config');
  const { createORMContext, getDataSourceRead, getDataSourceReadWrite } =
    await import('@podverse/orm');
  const { createFirebaseContext } = await import('@podverse/external-services-firebase');
  const { createNotificationsContext } = await import('@podverse/notifications');
  const { createParserContext } = await import('@podverse/parser');
  const { activeMQArtemisService } = await import('./factories/activeMQArtemisService.js');
  const { keyvaldb } = await import('./lib/keyvaldb/keyvaldb.js');
  const { waitForKeyvalPingReady } = await import('./lib/keyvaldb/waitForKeyvalPingReady.js');

  const shutdown = async (signal?: string) => {
    try {
      loggerService.info(`Shutdown initiated${signal ? ` due to ${signal}` : ''}`);
      if (serverInstance) {
        const server = serverInstance;
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        loggerService.info('HTTP server closed');
      }
      try {
        await activeMQArtemisService.close();
      } catch (err) {
        loggerService.error('Error closing Artemis during shutdown', err as Error);
      }
      try {
        await getDataSourceRead().destroy();
        await getDataSourceReadWrite().destroy();
        loggerService.info('Database connections closed');
      } catch (err) {
        loggerService.error('Error closing DB connections during shutdown', err as Error);
      }
      try {
        if (keyvaldb.status === 'ready' || keyvaldb.status === 'connecting') {
          await keyvaldb.quit();
          loggerService.info('KeyValDB connection closed');
        } else {
          loggerService.info('KeyValDB connection already closed');
        }
      } catch (err) {
        loggerService.error('Error closing KeyValDB connection during shutdown', err as Error);
      }
      try {
        const { shutdownApiExtensions } = await import('./lib/extensions/bootstrapExtensions.js');
        await shutdownApiExtensions();
      } catch (err) {
        loggerService.error('Error shutting down extensions during shutdown', err as Error);
      }
      try {
        await shutdownObservability();
      } catch (err) {
        loggerService.error('Error shutting down observability during shutdown', err as Error);
      }
    } catch (err) {
      loggerService.error('Error during shutdown', err as Error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    // Build module configs from app config
    /* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup */
    const ormConfig = {
      nodeEnv: config.nodeEnv,
      database: {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT!, 10),
        read_username: process.env.DB_APP_READ_USER!,
        read_password: process.env.DB_APP_READ_PASSWORD!,
        read_write_username: process.env.DB_APP_READ_WRITE_USER!,
        read_write_password: process.env.DB_APP_READ_WRITE_PASSWORD!,
        database: process.env.DB_APP_NAME!,
        ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
      },
      log: {
        level: config.log.level,
        dir: process.env.LOG_DIR ?? '',
        timer: process.env.LOG_TIMER === 'true',
      },
      defaults: {
        account: {
          settings: {
            locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
          },
        },
      },
      addByRssCredentialsEncryptionKey:
        process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY ?? undefined,
      addByRssCredentialsEncryptionKeyOld:
        process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD ?? undefined,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    const externalServicesConfig = {
      firebase: {
        notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
        admin_json_key_path: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH || '',
      },
      web: {
        protocol: config.web.protocol,
        host: config.web.domain,
        icon_image_url: process.env.WEB_ICON_IMAGE_PATH || '',
      },
    };

    const notificationsConfig = {
      brandName: process.env.BRAND_NAME || '',
      web: {
        protocol: config.web.protocol,
        host: config.web.domain,
        icon_image_path: process.env.WEB_ICON_IMAGE_PATH || '',
      },
      webpush: {
        enabled: process.env.WEBPUSH_ENABLED === 'true',
        vapid_public_key: process.env.WEBPUSH_VAPID_PUBLIC_KEY || '',
        vapid_private_key: process.env.WEBPUSH_VAPID_PRIVATE_KEY || '',
        vapid_subject: process.env.WEBPUSH_VAPID_SUBJECT || '',
      },
    };

    const parserConfig = {
      userAgent: config.userAgent,
      log: {
        level: config.log.level,
        dir: process.env.LOG_DIR ?? '',
        timer: process.env.LOG_TIMER === 'true',
      },
      firebase: {
        notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
        authJsonPath: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH || '',
      },
      podcastIndex: {
        authKey: config.podcastIndex.authKey,
        baseUrl: config.podcastIndex.baseUrl,
        secretKey: config.podcastIndex.secretKey,
        rateLimitDelay: process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY
          ? parseInt(process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY, 10)
          : 0, // TODO: determine if rateLimitDelay should be enabled in API
      },
      defaults: {
        account: {
          settings: {
            locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
          },
        },
      },
    };

    // Validate all module configs
    assertConfigValid(validateORMConfig(ormConfig), 'podverse-orm');
    assertConfigValid(
      validateExternalServicesConfig(externalServicesConfig),
      'podverse-external-services'
    );
    assertConfigValid(validateNotificationsConfig(notificationsConfig), 'podverse-notifications');
    assertConfigValid(validateParserConfig(parserConfig), 'podverse-parser');

    // Create module contexts
    const ormContext = createORMContext(ormConfig);
    const firebaseContext = createFirebaseContext(externalServicesConfig);
    const notificationsContext = createNotificationsContext(notificationsConfig);
    createParserContext({
      config: parserConfig,
      notificationsContext,
      firebaseContext,
    });

    loggerService.info('Connecting to the database');
    await ormContext.dataSourceRead.initialize();
    await ormContext.dataSourceReadWrite.initialize();
    loggerService.info('Connected to the database');

    loggerService.info(
      'KEYVALDB_* is configured; waiting for KeyValDB before accepting traffic...'
    );
    const keyvalReady = await waitForKeyvalPingReady();
    if (!keyvalReady) {
      throw new Error('FATAL: KeyValDB is unreachable at startup (KEYVALDB_* configured).');
    }
    loggerService.info('Connected to KeyValDB');

    const { startApp } = await import('./app.js');
    const server = await startApp();
    if (server) {
      serverInstance = server;
    }
  } catch (error) {
    // For validation errors, log just the message without stack trace
    if (error instanceof Error && error.message.includes('FATAL:')) {
      console.error(error.message);
      process.exit(1);
    } else {
      // Other errors - log with full details
      loggerService.error('Error during application startup', error);
      process.exit(1);
    }
  }
};

void run();
