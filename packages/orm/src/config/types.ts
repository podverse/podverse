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
  /** 32-byte key (64 hex chars) for encrypting add-by-RSS Basic Auth credentials at rest. Required. */
  addByRssCredentialsEncryptionKey?: string;
  /** Optional: previous key (64 hex chars) for key rotation. When set, decryptCredentials will try this key if decryption with the current key fails, so existing ciphertext remains readable until re-encryption script has run. */
  addByRssCredentialsEncryptionKeyOld?: string;
};
