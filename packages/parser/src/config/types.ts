/**
 * Configuration types for podverse-parser
 * These types are used by the app to create the configuration object
 * that gets passed to createParserContext()
 */

export type LogConfig = {
  level: string;
  dir?: string;
  timer?: boolean;
};

export type FirebaseConfig = {
  notifications_enabled: boolean;
  authJsonPath?: string | undefined;
};

export type PodcastIndexConfig = {
  authKey: string;
  baseUrl: string;
  secretKey: string;
  rateLimitDelay?: number;
};

export type ParserSettingsConfig = {
  addRemoteItemsToMQ: boolean;
};

export type DefaultsConfig = {
  account: {
    settings: {
      locale?: string | undefined;
    };
  };
};

export type ParserConfig = {
  userAgent: string;
  log: LogConfig;
  firebase: FirebaseConfig;
  podcastIndex?: PodcastIndexConfig;
  parser?: ParserSettingsConfig;
  defaults: DefaultsConfig;
  /** When true, bypass Podcast Index (mock PI service) and use URL-only feed lookup. For test-assets and tools. */
  testAssetsMode?: boolean;
};
