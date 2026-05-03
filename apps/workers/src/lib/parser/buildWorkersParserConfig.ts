import type { ParserConfig } from '@podverse/helpers-config';

import type { BaseConfig, PodcastIndexConfig } from '../../config/index.js';
import { parseSpamFeedItemThresholdEnv } from './spamThresholdEnv.js';

export type SpamFeedItemThresholdDefaults = {
  defaultLimit: number;
  spamPermittedLimit: number;
};

export { parseSpamFeedItemThresholdEnv } from './spamThresholdEnv.js';

export type BuildWorkersParserConfigParams = {
  baseConfig: BaseConfig;
  podcastIndexConfig: PodcastIndexConfig | undefined;
  spamThresholdDefaults: SpamFeedItemThresholdDefaults;
};

export function buildWorkersParserConfig(params: BuildWorkersParserConfigParams): ParserConfig {
  const { baseConfig, podcastIndexConfig, spamThresholdDefaults } = params;

  return {
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
    podcastIndex: podcastIndexConfig
      ? {
          authKey: podcastIndexConfig.authKey,
          baseUrl: podcastIndexConfig.baseUrl,
          secretKey: podcastIndexConfig.secretKey,
          rateLimitDelay: podcastIndexConfig.rateLimitDelay ?? 0,
        }
      : undefined,
    parser: {
      addRemoteItemsToMQ: process.env.PARSER_ADD_REMOTE_ITEMS_TO_MQ === 'true',
      spamFeedItemThresholdDefault: parseSpamFeedItemThresholdEnv(
        'PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT',
        process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT,
        spamThresholdDefaults.defaultLimit
      ),
      spamFeedItemThresholdSpamPermitted: parseSpamFeedItemThresholdEnv(
        'PARSER_SPAM_FEED_ITEM_THRESHOLD_SPAM_PERMITTED',
        process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_SPAM_PERMITTED,
        spamThresholdDefaults.spamPermittedLimit
      ),
    },
    defaults: {
      account: {
        settings: {
          locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
        },
      },
    },
  };
}
