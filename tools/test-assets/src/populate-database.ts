import { createORMContext, getDataSourceRead, getDataSourceReadWrite } from '@podverse/orm';
import { createParserContext, parseRSSFeedAndSaveToDatabase } from '@podverse/parser';

/**
 * Populates the database with channel and items by parsing the given feed URL
 * using the parser in test-assets mode (no Podcast Index API; IDs auto-assigned).
 *
 * podcastIndexIdHint: lookup key to find an existing feed by podcast_index_id.
 * If not found, the parser assigns the next available ID (max+1, or 1 if empty).
 * Default 1 for the first feed.
 *
 * Requires DB_* and DEFAULT_ACCOUNT_SETTINGS_LOCALE (or similar) env vars to be set
 * (e.g. load .env.api before calling).
 */
export async function populateDatabaseFromFeed(
  feedUrl: string,
  podcastIndexIdHint: number = 1
): Promise<void> {
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  const dbDatabase = process.env.DB_DATABASE;
  const dbReadUsername = process.env.DB_READ_USERNAME;
  const dbReadPassword = process.env.DB_READ_PASSWORD;
  const dbReadWriteUsername = process.env.DB_READ_WRITE_USERNAME;
  const dbReadWritePassword = process.env.DB_READ_WRITE_PASSWORD;

  if (
    !dbHost ||
    !dbPort ||
    !dbDatabase ||
    !dbReadUsername ||
    !dbReadPassword ||
    !dbReadWriteUsername ||
    !dbReadWritePassword
  ) {
    throw new Error(
      'populateDatabaseFromFeed: DB_* env vars required (DB_HOST, DB_PORT, DB_DATABASE, DB_READ_USERNAME, DB_READ_PASSWORD, DB_READ_WRITE_USERNAME, DB_READ_WRITE_PASSWORD). Create .env.api from tools/web-perf/lighthouse/.env.api.example and set DB_* there (or set DB_* in the environment).'
    );
  }

  const ormConfig = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
      host: dbHost,
      port: parseInt(dbPort, 10),
      read_username: dbReadUsername,
      read_password: dbReadPassword,
      read_write_username: dbReadWriteUsername,
      read_write_password: dbReadWritePassword,
      database: dbDatabase,
      ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
    },
    log: {
      level: process.env.LOG_LEVEL ?? 'info',
      dir: process.env.LOG_DIR ?? '',
      timer: process.env.LOG_TIMER === 'true',
    },
    defaults: {
      account: {
        settings: {
          locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE ?? 'en',
        },
      },
    },
  };

  const ormContext = createORMContext(ormConfig);
  await ormContext.dataSourceRead.initialize();
  await ormContext.dataSourceReadWrite.initialize();

  const parserConfig = {
    userAgent: process.env.USER_AGENT ?? 'Podverse-Test-Assets/1.0',
    log: { level: ormConfig.log.level, timer: ormConfig.log.timer },
    firebase: { notifications_enabled: false },
    defaults: ormConfig.defaults,
    testAssetsMode: true,
  };

  createParserContext({ config: parserConfig });

  try {
    await parseRSSFeedAndSaveToDatabase(feedUrl, podcastIndexIdHint, {
      forceParse: true,
      onDemandParserEvent: {
        accountId: null,
        remoteParentPodcastIndexId: null,
        type: null,
      },
    });
  } finally {
    await getDataSourceRead().destroy();
    await getDataSourceReadWrite().destroy();
  }
}
