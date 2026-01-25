/* eslint-disable @typescript-eslint/no-require-imports */
// Dynamic require needed for conditional env loading before imports execute
if (process.env.NODE_ENV !== 'production') {
  require('@dotenvx/dotenvx').config({ path: '.env' });
}
/* eslint-enable @typescript-eslint/no-require-imports */

// Validate environment variables BEFORE importing config
import { validateStartupRequirements } from './lib/startup/validation';
validateStartupRequirements();

/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup above */

import {
  validateORMConfig,
  validateExternalServicesConfig,
  validateParserConfig,
  assertConfigValid,
} from '@podverse/helpers';
import { createORMContext } from '@podverse/orm';
import { createFirebaseContext } from '@podverse/external-services';
import { createNotificationsContext } from '@podverse/notifications';
import { createParserContext } from '@podverse/parser';
import commands from '@workers/commands';
import { parseArgs } from '@workers/commands/parseArgs';
import { loggerService } from './factories/loggerService';
import { config } from './config';

const args = parseArgs();
const commandName = (args._ as string[])[0];

if (!commandName) {
  process.exit(1);
}

const command = commands[commandName];

const runApp = async () => {
  try {
    // Build module configs from app config and env vars
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
        level: config.log.level,
        dir: config.log.dir,
        timer: config.log.timer,
      },
      defaults: {
        account: {
          settings: {
            locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
          },
        },
      },
    };

    const externalServicesConfig = {
      firebase: {
        notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
        admin_json_key_path: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH,
      },
      web: {
        protocol: process.env.WEB_PROTOCOL!,
        host: process.env.WEB_DOMAIN!,
        icon_image_url: process.env.WEB_ICON_IMAGE_PATH,
      },
    };

    const notificationsConfig = {
      brandName: process.env.BRAND_NAME!,
      web: {
        protocol: process.env.WEB_PROTOCOL!,
        host: process.env.WEB_DOMAIN!,
        icon_image_path: process.env.WEB_ICON_IMAGE_PATH,
      },
      webpush: {
        enabled: process.env.WEBPUSH_ENABLED === 'true',
        vapid_public_key: process.env.WEBPUSH_VAPID_PUBLIC_KEY,
        vapid_private_key: process.env.WEBPUSH_VAPID_PRIVATE_KEY,
        vapid_subject: process.env.WEBPUSH_VAPID_SUBJECT,
      },
    };

    const parserConfig = {
      userAgent: config.userAgent,
      log: {
        level: config.log.level,
        dir: config.log.dir,
        timer: config.log.timer,
      },
      firebase: {
        notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
        authJsonPath: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH,
      },
      podcastIndex: {
        authKey: config.podcastIndex.authKey,
        baseUrl: config.podcastIndex.baseUrl,
        secretKey: config.podcastIndex.secretKey,
        rateLimitDelay: process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY 
          ? parseInt(process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY, 10) 
          : 0,
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

    // Validate all module configs
    assertConfigValid(validateORMConfig(ormConfig), 'podverse-orm');
    assertConfigValid(validateExternalServicesConfig(externalServicesConfig), 'podverse-external-services');
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

    loggerService.info('Connecting to the databases');
    await ormContext.dataSourceRead.initialize();
    await ormContext.dataSourceReadWrite.initialize();
    loggerService.info('Connected to the databases');

    if (command) {
      await command(args);
    } else {
      loggerService.logError(`runApp: Command "${commandName}" not found.`);
    }
  } catch (error) {
    // For validation errors, log just the message without stack trace
    if (error instanceof Error && error.message.includes('FATAL:')) {
      console.error(error.message);
      process.exit(1);
    } else {
      loggerService.logError('Error running app:', error as Error);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
};

runApp();
