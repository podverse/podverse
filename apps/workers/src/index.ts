import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const loadEnv = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const dotenvx = await import('@dotenvx/dotenvx');
    // Resolve relative to this file so `node apps/workers/dist/index.js` from the monorepo root
    // still loads `apps/workers/.env` (not cwd-based `.env`).
    const distDir = dirname(fileURLToPath(import.meta.url));
    const workersEnv = join(distDir, '..', '.env');
    const monorepoRootEnv = join(distDir, '..', '..', '..', '.env');
    const envFilePath = existsSync(workersEnv)
      ? workersEnv
      : existsSync(monorepoRootEnv)
        ? monorepoRootEnv
        : workersEnv;
    dotenvx.config({ path: envFilePath });
  }
};

const run = async () => {
  await loadEnv();

  // Command-first bootstrap: resolve command from argv before validation or config
  const argv = process.argv.slice(2);
  const commandName = (argv[0] as string) ?? '';
  const longRunningCommands = new Set([
    'mqRSSRunParser',
    'mqAddByRSSRunParser',
    'mqRSSRunLiveItemListener',
    'mqRSSRunDlqConsumer',
    'imageShrinkRunConsumer',
  ]);

  const { KNOWN_COMMANDS } = await import('@workers/commands/commandNames.js');
  if (!commandName || !KNOWN_COMMANDS.includes(commandName)) {
    console.error('FATAL: Missing or unknown command. Usage: node index.js <command> [args]');
    process.exit(1);
  }

  // Validate environment variables for this command BEFORE importing config
  const { validateStartupRequirements } = await import('./lib/startup/validation.js');
  validateStartupRequirements(commandName);

  const {
    getCategoriesForCommand,
    CATEGORY_ORM,
    CATEGORY_MQ,
    CATEGORY_PARSER,
    CATEGORY_PODCAST_INDEX,
    CATEGORY_WEB_NOTIFICATIONS,
    CATEGORY_KEYVALDB,
    CATEGORY_IMAGE_SHRINK,
  } = await import('./lib/startup/categoriesForCommand.js');

  /**
   * Unlike other apps and packages, config and heavy modules are loaded via dynamic import after
   * validation. Static imports are hoisted and run at module load time—before we know the
   * command or run validation. If we imported config/orm/parser/etc here, they would read env and
   * build config before validateStartupRequirements() runs, breaking per-command validation and
   * lazy loading.
   */
  /* eslint-disable @typescript-eslint/no-non-null-assertion -- load after validation; env vars validated at startup */
  const {
    validateORMConfig,
    validateExternalServicesConfig,
    validateParserConfig,
    assertConfigValid,
  } = await import('@podverse/helpers-config');
  const { createORMContext, DEFAULT_SPAM_FEED_ITEM_THRESHOLDS } = await import('@podverse/orm');
  const { createFirebaseContext } = await import('@podverse/external-services-firebase');
  const { PodcastIndexService } = await import('@podverse/external-services-podcast-index');
  const { createNotificationsContext } = await import('@podverse/notifications');
  const { createParserContext } = await import('@podverse/parser');
  const { LoggerService } = await import('@podverse/helpers-backend');
  const { ObjectStorageService } = await import('@podverse/external-services-object-storage');
  const { default: commands } = await import('@workers/commands/index.js');
  const { parseArgs } = await import('@workers/commands/parseArgs.js');
  const {
    getBaseConfig,
    getMQConfig,
    getPodcastIndexConfig,
    getExternalServicesConfig,
    getNotificationsConfig,
    getKeyvaldbConfig,
    getBucketRuntimeConfig,
    isImageShrinkEnabled,
  } = await import('./config/index.js');
  const { setLoggerService, getLoggerService } = await import('./factories/loggerService.js');
  const { setLogger } = await import('./factories/logger.js');
  const { setTimerManager } = await import('./factories/timerManager.js');
  const { setActiveMQArtemisService } = await import('./factories/activeMQArtemisService.js');
  const { setImageStorageService } = await import('./factories/imageStorageService.js');
  const { initKeyvaldb, testKeyvaldbConnection, waitForKeyvaldbConnection } =
    await import('./lib/keyvaldb/keyvaldb.js');
  const { ActiveMQArtemisService } = await import('@podverse/mq');
  const { setPodcastIndexService } = await import('./factories/podcastIndexService.js');

  const args = parseArgs();
  const argsCommandName = (args._ as string[])[0];

  if (!argsCommandName) {
    process.exit(1);
  }

  const command = commands[argsCommandName];
  const categories = getCategoriesForCommand(commandName);

  const runApp = async () => {
    try {
      // Base config and logger: every command needs these (validated as Base category)
      const baseConfig = getBaseConfig();
      setLoggerService(
        new LoggerService({ logLevel: baseConfig.log.level, logDir: baseConfig.log.dir })
      );
      setLogger(baseConfig);
      setTimerManager(baseConfig);

      let ormContext: ReturnType<typeof createORMContext> | null = null;

      if (categories.has(CATEGORY_ORM)) {
        const ormConfig = {
          nodeEnv: process.env.NODE_ENV ?? 'development',
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
            level: baseConfig.log.level,
            dir: baseConfig.log.dir,
            timer: baseConfig.log.timer,
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
        assertConfigValid(validateORMConfig(ormConfig), 'podverse-orm');
        ormContext = createORMContext(ormConfig);
      }

      let firebaseContext: ReturnType<typeof createFirebaseContext> | undefined;
      let notificationsContext: ReturnType<typeof createNotificationsContext> | undefined;

      if (categories.has(CATEGORY_WEB_NOTIFICATIONS)) {
        const externalServicesConfig = getExternalServicesConfig();
        const notificationsConfig = getNotificationsConfig();
        assertConfigValid(
          validateExternalServicesConfig(externalServicesConfig),
          'podverse-external-services'
        );
        firebaseContext = createFirebaseContext(externalServicesConfig);
        notificationsContext = createNotificationsContext(notificationsConfig);
      }

      if (categories.has(CATEGORY_PODCAST_INDEX)) {
        const podcastIndexConfig = getPodcastIndexConfig();
        setPodcastIndexService(
          new PodcastIndexService({
            userAgent: baseConfig.userAgent,
            authKey: podcastIndexConfig.authKey,
            baseUrl: podcastIndexConfig.baseUrl,
            secretKey: podcastIndexConfig.secretKey,
            loggerService: getLoggerService(),
          })
        );
      }

      if (categories.has(CATEGORY_MQ)) {
        const mqConfig = getMQConfig();
        setActiveMQArtemisService(new ActiveMQArtemisService(mqConfig, getLoggerService()));
      }

      if (categories.has(CATEGORY_IMAGE_SHRINK)) {
        if (isImageShrinkEnabled()) {
          const bucketRuntime = getBucketRuntimeConfig();
          setImageStorageService(
            new ObjectStorageService({
              accessKey: bucketRuntime.accessKey,
              secretKey: bucketRuntime.secretKey,
              region: bucketRuntime.region,
              provider: bucketRuntime.provider,
              endpoint: bucketRuntime.endpoint,
              forcePathStyle: bucketRuntime.forcePathStyle,
              uploadPublicAcl: bucketRuntime.uploadPublicAcl,
            })
          );
        }
      }

      if (categories.has(CATEGORY_KEYVALDB)) {
        const { Redis } = await import('ioredis');
        const keyvaldbConfig = getKeyvaldbConfig();
        const client = new Redis({
          host: keyvaldbConfig.host,
          port: keyvaldbConfig.port,
          password: keyvaldbConfig.password,
          retryStrategy: (times: number) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 3000);
          },
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
        initKeyvaldb(client, keyvaldbConfig);
        const keyvaldbReady = await waitForKeyvaldbConnection();
        if (!keyvaldbReady) {
          console.error('KeyValDB connection did not become ready before ping', {
            host: keyvaldbConfig.host,
            port: keyvaldbConfig.port,
          });
          throw new Error('FATAL: KeyValDB connection not ready');
        }
        const keyvaldbOk = await testKeyvaldbConnection();
        if (!keyvaldbOk) {
          console.error('KeyValDB connection test failed', {
            host: keyvaldbConfig.host,
            port: keyvaldbConfig.port,
          });
          throw new Error('FATAL: KeyValDB connection test failed');
        }
      }

      if (categories.has(CATEGORY_PARSER)) {
        const { buildWorkersParserConfig } =
          await import('./lib/parser/buildWorkersParserConfig.js');
        const podcastIndexConfig = categories.has(CATEGORY_PODCAST_INDEX)
          ? getPodcastIndexConfig()
          : undefined;
        const parserConfig = buildWorkersParserConfig({
          baseConfig,
          podcastIndexConfig,
          spamThresholdDefaults: DEFAULT_SPAM_FEED_ITEM_THRESHOLDS,
        });
        assertConfigValid(validateParserConfig(parserConfig), 'podverse-parser');
        createParserContext({
          config: parserConfig,
          notificationsContext,
          firebaseContext,
        });
      }

      if (ormContext) {
        getLoggerService().info('Connecting to the databases');
        await ormContext.dataSourceRead.initialize();
        await ormContext.dataSourceReadWrite.initialize();
        getLoggerService().info('Connected to the databases');
      }

      if (command) {
        await command(args);
      } else {
        getLoggerService().logError(`runApp: Command "${commandName}" not found.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('FATAL:')) {
        console.error(error.message);
        process.exit(1);
      } else {
        // Logger may not be initialized if error occurred during early bootstrap
        try {
          getLoggerService().logError('Error running app:', error as Error);
        } catch {
          console.error('Error running app:', error);
        }
        process.exit(1);
      }
    } finally {
      if (!longRunningCommands.has(commandName)) {
        process.exit(0);
      }
    }
  };

  await runApp();
};

void run();
