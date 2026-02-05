/**
 * Configuration validation utilities for podverse modules.
 *
 * These functions validate configuration objects that are passed to module factories.
 * They should be called at app startup BEFORE creating module contexts.
 *
 * @example
 * ```typescript
 * const ormConfig: ORMConfig = { database: {...}, log: {...}, defaults: {...} };
 * validateORMConfig(ormConfig); // Throws if invalid
 * const ormContext = createORMContext(ormConfig);
 * ```
 */

export type ConfigValidationError = {
  field: string;
  message: string;
  required: boolean;
};

export type ConfigValidationResult = {
  valid: boolean;
  errors: ConfigValidationError[];
};

function createError(field: string, message: string, required = true): ConfigValidationError {
  return { field, message, required };
}

/**
 * Validates ORM configuration
 */
export type ORMConfig = {
  nodeEnv?: string;
  database: {
    host: string;
    port: number;
    read_username: string;
    read_password: string;
    read_write_username: string;
    read_write_password: string;
    database: string;
    ssl_connection: boolean;
  };
  log: {
    level: string;
    dir?: string;
    timer?: boolean;
  };
  defaults: {
    account: {
      settings: {
        locale?: string | undefined;
      };
    };
  };
};

export function validateORMConfig(config: ORMConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  // Database config validation
  if (!config.database) {
    errors.push(createError('database', 'Database configuration is required'));
  } else {
    if (!config.database.host || config.database.host.trim() === '') {
      errors.push(createError('database.host', 'Database host is required'));
    }
    if (!config.database.port || config.database.port <= 0) {
      errors.push(createError('database.port', 'Database port must be a positive number'));
    }
    if (!config.database.read_username || config.database.read_username.trim() === '') {
      errors.push(createError('database.read_username', 'Database read username is required'));
    }
    if (!config.database.read_password) {
      errors.push(createError('database.read_password', 'Database read password is required'));
    }
    if (!config.database.read_write_username || config.database.read_write_username.trim() === '') {
      errors.push(
        createError('database.read_write_username', 'Database read-write username is required')
      );
    }
    if (!config.database.read_write_password) {
      errors.push(
        createError('database.read_write_password', 'Database read-write password is required')
      );
    }
    if (!config.database.database || config.database.database.trim() === '') {
      errors.push(createError('database.database', 'Database name is required'));
    }
  }

  // Log config validation
  if (!config.log) {
    errors.push(createError('log', 'Log configuration is required'));
  } else {
    if (!config.log.level || config.log.level.trim() === '') {
      errors.push(createError('log.level', 'Log level is required'));
    }
  }

  // Defaults validation
  if (!config.defaults) {
    errors.push(createError('defaults', 'Defaults configuration is required'));
  } else {
    if (!config.defaults.account?.settings?.locale) {
      errors.push(
        createError('defaults.account.settings.locale', 'Default account locale is required')
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Notifications configuration
 */
export type NotificationsConfig = {
  brandName: string;
  web: {
    protocol: string;
    host: string;
    icon_image_path?: string | undefined;
  };
  webpush: {
    enabled: boolean;
    vapid_public_key?: string | undefined;
    vapid_private_key?: string | undefined;
    vapid_subject?: string | undefined;
  };
};

export function validateNotificationsConfig(config: NotificationsConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  // Brand name validation
  if (!config.brandName || config.brandName.trim() === '') {
    errors.push(createError('brandName', 'Brand name is required'));
  }

  // Web config validation
  if (!config.web) {
    errors.push(createError('web', 'Web configuration is required'));
  } else {
    if (!config.web.protocol || config.web.protocol.trim() === '') {
      errors.push(createError('web.protocol', 'Web protocol is required'));
    }
    if (!config.web.host || config.web.host.trim() === '') {
      errors.push(createError('web.host', 'Web host is required'));
    }
    // icon_image_path is optional
  }

  // WebPush config validation (only required fields if enabled)
  if (config.webpush?.enabled) {
    if (!config.webpush.vapid_public_key || config.webpush.vapid_public_key.trim() === '') {
      errors.push(
        createError(
          'webpush.vapid_public_key',
          'VAPID public key is required when WebPush is enabled'
        )
      );
    }
    if (!config.webpush.vapid_private_key || config.webpush.vapid_private_key.trim() === '') {
      errors.push(
        createError(
          'webpush.vapid_private_key',
          'VAPID private key is required when WebPush is enabled'
        )
      );
    }
    if (!config.webpush.vapid_subject || config.webpush.vapid_subject.trim() === '') {
      errors.push(
        createError('webpush.vapid_subject', 'VAPID subject is required when WebPush is enabled')
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates External Services configuration
 */
export type ExternalServicesConfig = {
  firebase: {
    notifications_enabled: boolean;
    admin_json_key_path?: string | undefined;
  };
  web: {
    protocol: string;
    host: string;
    icon_image_url?: string | undefined;
  };
};

export function validateExternalServicesConfig(
  config: ExternalServicesConfig
): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  // Firebase config validation (only required fields if enabled)
  if (config.firebase?.notifications_enabled) {
    if (!config.firebase.admin_json_key_path || config.firebase.admin_json_key_path.trim() === '') {
      errors.push(
        createError(
          'firebase.admin_json_key_path',
          'Firebase admin JSON key path is required when Firebase is enabled'
        )
      );
    }
  }

  // Web config validation
  if (!config.web) {
    errors.push(createError('web', 'Web configuration is required'));
  } else {
    if (!config.web.protocol || config.web.protocol.trim() === '') {
      errors.push(createError('web.protocol', 'Web protocol is required'));
    }
    if (!config.web.host || config.web.host.trim() === '') {
      errors.push(createError('web.host', 'Web host is required'));
    }
    // icon_image_url is optional
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Parser configuration
 */
export type ParserConfig = {
  userAgent: string;
  log: {
    level: string;
    dir?: string;
    timer?: boolean;
  };
  firebase: {
    notifications_enabled: boolean;
    authJsonPath?: string | undefined;
  };
  podcastIndex?: {
    authKey: string;
    baseUrl: string;
    secretKey: string;
    rateLimitDelay?: number;
  };
  parser?: {
    addRemoteItemsToMQ: boolean;
  };
  defaults: {
    account: {
      settings: {
        locale?: string | undefined;
      };
    };
  };
};

export function validateParserConfig(config: ParserConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  // User agent validation
  if (!config.userAgent || config.userAgent.trim() === '') {
    errors.push(createError('userAgent', 'User agent is required'));
  }

  // Log config validation
  if (!config.log) {
    errors.push(createError('log', 'Log configuration is required'));
  } else {
    if (!config.log.level || config.log.level.trim() === '') {
      errors.push(createError('log.level', 'Log level is required'));
    }
  }

  // Firebase config validation (only required fields if enabled)
  if (config.firebase?.notifications_enabled) {
    if (!config.firebase.authJsonPath || config.firebase.authJsonPath.trim() === '') {
      errors.push(
        createError(
          'firebase.authJsonPath',
          'Firebase auth JSON path is required when Firebase is enabled'
        )
      );
    }
  }

  // Podcast Index config validation (only when provided)
  if (config.podcastIndex) {
    if (!config.podcastIndex.authKey || config.podcastIndex.authKey.trim() === '') {
      errors.push(createError('podcastIndex.authKey', 'Podcast Index auth key is required'));
    }
    if (!config.podcastIndex.baseUrl || config.podcastIndex.baseUrl.trim() === '') {
      errors.push(createError('podcastIndex.baseUrl', 'Podcast Index base URL is required'));
    }
    if (!config.podcastIndex.secretKey || config.podcastIndex.secretKey.trim() === '') {
      errors.push(createError('podcastIndex.secretKey', 'Podcast Index secret key is required'));
    }
  }

  // Defaults validation
  if (!config.defaults) {
    errors.push(createError('defaults', 'Defaults configuration is required'));
  } else {
    if (!config.defaults.account?.settings?.locale) {
      errors.push(
        createError('defaults.account.settings.locale', 'Default account locale is required')
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to throw an error if validation fails
 */
export function assertConfigValid(result: ConfigValidationResult, configName: string): void {
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n');
    throw new Error(`FATAL: ${configName} validation failed:\n${errorMessages}`);
  }
}
