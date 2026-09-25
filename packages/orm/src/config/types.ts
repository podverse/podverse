/**
 * Configuration types for podverse-orm
 * These types are used by the app to create the configuration object
 * that gets passed to createORMContext()
 */

export type DatabaseConfig = {
  host: string;
  port: number;
  read_username: string;
  read_password: string;
  read_write_username: string;
  read_write_password: string;
  database: string;
  ssl_connection: boolean;
};

export type LogConfig = {
  level: string;
  dir?: string;
  timer?: boolean;
};

export type DefaultsConfig = {
  account: {
    settings: {
      locale?: string | undefined;
    };
  };
};

export type ORMConfig = {
  nodeEnv?: string;
  database: DatabaseConfig;
  log: LogConfig;
  defaults: DefaultsConfig;
  /**
   * Add-by-RSS transit key (64 hex chars). The ORM stores no credentials and does not read this;
   * API and workers seal and open queue envelopes with it through `@podverse/helpers-backend`.
   */
  addByRssCredentialsEncryptionKey?: string;
  /** Previous transit key during rotation; see `addByRssCredentialsEncryptionKey`. */
  addByRssCredentialsEncryptionKeyOld?: string;
};
