/* eslint-disable @typescript-eslint/no-require-imports */
// Dynamic require needed for conditional env loading before imports execute
if (process.env.NODE_ENV !== 'production') {
  require('@dotenvx/dotenvx').config({ path: '.env' });
}
/* eslint-enable @typescript-eslint/no-require-imports */

// Command-first bootstrap: resolve command from argv before validation or config
const argv = process.argv.slice(2);
const commandName = (argv[0] as string) ?? '';

import { KNOWN_COMMANDS } from '@workers/commands/commandNames';
if (!commandName || !KNOWN_COMMANDS.includes(commandName)) {
  console.error('FATAL: Missing or unknown command. Usage: node index.js <command> [args]');
  process.exit(1);
}

// Validate environment variables for this command BEFORE importing config
import { validateStartupRequirements } from './lib/startup/validation';
validateStartupRequirements(commandName);

import {
  getCategoriesForCommand,
  CATEGORY_ORM,
  CATEGORY_MQ,
  CATEGORY_PARSER,
  CATEGORY_PODCAST_INDEX,
  CATEGORY_WEB_NOTIFICATIONS,
} from './lib/startup/categoriesForCommand';

/**
 * Unlike other apps and packages, config and heavy modules are loaded via require() instead of
 * static import. Static imports are hoisted and run at module load time—before we know the
 * command or run validation. If we imported config/orm/parser/etc here, they would read env and
 * build config before validateStartupRequirements() runs, breaking per-command validation and
 * lazy loading. require() runs in order, so these load only after validation; only the current
 * command's categories are then used in runApp(). Do not convert these to import.
 */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-non-null-assertion -- load after validation; env vars validated at startup */
const {
  validateORMConfig,
  validateExternalServicesConfig,
  validateParserConfig,
  assertConfigValid,
} = require('@podverse/helpers-config') as typeof import('@podverse/helpers-config');
const { createORMContext } = require('@podverse/orm') as typeof import('@podverse/orm');
const { createFirebaseContext } =
  require('@podverse/external-services') as typeof import('@podverse/external-services');
const { createNotificationsContext } =
  require('@podverse/notifications') as typeof import('@podverse/notifications');
const { createParserContext } = require('@podverse/parser') as typeof import('@podverse/parser');
const { LoggerService } =
  require('@podverse/helpers-backend') as typeof import('@podverse/helpers-backend');
const { PodcastIndexService } =
  require('@podverse/external-services') as typeof import('@podverse/external-services');
const commands = require('@workers/commands').default as typeof import('@workers/commands').default;
const { parseArgs } =
  require('@workers/commands/parseArgs') as typeof import('@workers/commands/parseArgs');
const {
  getBaseConfig,
  getMQConfig,
  getPodcastIndexConfig,
  getExternalServicesConfig,
  getNotificationsConfig,
} = require('./config') as typeof import('./config');
const { setLoggerService, getLoggerService } =
  require('./factories/loggerService') as typeof import('./factories/loggerService');
const { setLogger } = require('./factories/logger') as typeof import('./factories/logger');
const { setTimerManager } =
  require('./factories/timerManager') as typeof import('./factories/timerManager');
const { setActiveMQArtemisService } =
  require('./factories/activeMQArtemisService') as typeof import('./factories/activeMQArtemisService');
const { ActiveMQArtemisService } = require('@podverse/mq') as typeof import('@podverse/mq');
const { setPodcastIndexService } =
  require('./factories/podcastIndexService') as typeof import('./factories/podcastIndexService');
/* eslint-enable @typescript-eslint/no-require-imports */

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
          read_username: process.env.DB_READ_USERNAME!,
          read_password: process.env.DB_READ_PASSWORD!,
          read_write_username: process.env.DB_READ_WRITE_USERNAME!,
          read_write_password: process.env.DB_READ_WRITE_PASSWORD!,
          database: process.env.DB_DATABASE!,
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
      };
      assertConfigValid(validateORMConfig(ormConfig), 'podverse-orm');
      ormContext = createORMContext(ormConfig);
    }

    let firebaseContext: ReturnType<typeof createFirebaseContext> | null = null;
    let notificationsContext: ReturnType<typeof createNotificationsContext> | null = null;

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

    if (categories.has(CATEGORY_PARSER)) {
      const podcastIndexConfig = categories.has(CATEGORY_PODCAST_INDEX)
        ? getPodcastIndexConfig()
        : { authKey: '', baseUrl: '', secretKey: '' };
      const parserConfig = {
        userAgent: baseConfig.userAgent,
        log: {
          level: baseConfig.log.level,
          dir: baseConfig.log.dir,
          timer: baseConfig.log.timer,
        },
        firebase: {
          notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
          authJsonPath: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH,
        },
        podcastIndex: {
          authKey: podcastIndexConfig.authKey,
          baseUrl: podcastIndexConfig.baseUrl,
          secretKey: podcastIndexConfig.secretKey,
          rateLimitDelay: podcastIndexConfig.rateLimitDelay ?? 0,
        },
        parser: {
          addRemoteItemsToMQ: process.env.PARSER_ADD_REMOTE_ITEMS_TO_MQ === 'true',
        },
        defaults: {
          account: {
            settings: {
              locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
            },
          },
        },
      };
      assertConfigValid(validateParserConfig(parserConfig), 'podverse-parser');
      if (firebaseContext && notificationsContext) {
        createParserContext({
          config: parserConfig,
          notificationsContext,
          firebaseContext,
        });
      }
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
      getLoggerService().logError('Error running app:', error as Error);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
};

runApp();
