import type { ExtensionManifest, ResolvedExtension } from '@podverse/extensions-sdk';
import { resolveExtensionConfig } from '@podverse/extensions-sdk';
import {
  createORMContext,
  ExtensionSettingsService,
  getDataSourceRead,
  readCachedExtensionSetting,
  writeCachedExtensionSetting,
} from '@podverse/orm';

import { getRuntimeConfig } from '../../config/runtime-config-store';
import { getExtensionRedisClient, toExtensionCacheClient } from './keyvalClient';
import { extensionRegistry } from './registry';

import 'server-only';

type DbRow = {
  enabled: boolean;
  config: Record<string, unknown>;
};

export type ActiveExtension = {
  manifest: ExtensionManifest;
  resolved: ResolvedExtension<Record<string, unknown>>;
};

const memoizedRows = new Map<string, DbRow | null>();
let ormInitPromise: Promise<boolean> | null = null;

function readRequiredString(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return value;
}

function readDefinedString(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

function readDbPort(): number | null {
  const raw = readRequiredString('DB_PORT');
  if (raw === null) {
    return null;
  }
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  return port;
}

function hasDbEnv(): boolean {
  return (
    readRequiredString('DB_HOST') !== null &&
    readDbPort() !== null &&
    readRequiredString('DB_APP_READ_USER') !== null &&
    readDefinedString('DB_APP_READ_PASSWORD') !== null &&
    readRequiredString('DB_APP_READ_WRITE_USER') !== null &&
    readDefinedString('DB_APP_READ_WRITE_PASSWORD') !== null &&
    readRequiredString('DB_APP_NAME') !== null
  );
}

async function ensureOrmInitialized(): Promise<boolean> {
  if (ormInitPromise !== null) {
    return ormInitPromise;
  }

  ormInitPromise = (async () => {
    if (!hasDbEnv()) {
      return false;
    }

    const dbPort = readDbPort();
    const dbHost = readRequiredString('DB_HOST');
    const dbReadUser = readRequiredString('DB_APP_READ_USER');
    const dbReadWriteUser = readRequiredString('DB_APP_READ_WRITE_USER');
    const dbName = readRequiredString('DB_APP_NAME');
    const dbReadPassword = readDefinedString('DB_APP_READ_PASSWORD');
    const dbReadWritePassword = readDefinedString('DB_APP_READ_WRITE_PASSWORD');

    if (
      dbPort === null ||
      dbHost === null ||
      dbReadUser === null ||
      dbReadWriteUser === null ||
      dbName === null ||
      dbReadPassword === null ||
      dbReadWritePassword === null
    ) {
      return false;
    }

    const context = createORMContext({
      nodeEnv: process.env.NODE_ENV,
      database: {
        host: dbHost,
        port: dbPort,
        read_username: dbReadUser,
        read_password: dbReadPassword,
        read_write_username: dbReadWriteUser,
        read_write_password: dbReadWritePassword,
        database: dbName,
        ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
      },
      log: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
      defaults: {
        account: {
          settings: {
            locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
          },
        },
      },
    });

    if (!context.dataSourceRead.isInitialized) {
      await context.dataSourceRead.initialize();
    }
    if (!context.dataSourceReadWrite.isInitialized) {
      await context.dataSourceReadWrite.initialize();
    }

    return true;
  })().catch(() => false);

  return ormInitPromise;
}

async function readDbRowFromDatabase(id: string): Promise<DbRow | null> {
  const ormReady = await ensureOrmInitialized();
  if (!ormReady) {
    return null;
  }

  try {
    const dataSource = getDataSourceRead();
    const row = await ExtensionSettingsService.findById(dataSource, id);
    if (row === null) {
      return null;
    }

    return {
      enabled: row.enabled === true,
      config: row.config,
    };
  } catch {
    return null;
  }
}

async function readDbRow(id: string): Promise<DbRow | null> {
  if (memoizedRows.has(id)) {
    return memoizedRows.get(id) ?? null;
  }

  const redis = getExtensionRedisClient();
  if (redis !== null) {
    const cacheClient = toExtensionCacheClient(redis);
    const cached = await readCachedExtensionSetting(cacheClient, id);
    if (cached !== null) {
      memoizedRows.set(id, cached);
      return cached;
    }
  }

  const dbRow = await readDbRowFromDatabase(id);
  memoizedRows.set(id, dbRow);

  if (redis !== null) {
    const cacheClient = toExtensionCacheClient(redis);
    await writeCachedExtensionSetting(cacheClient, id, dbRow);
  }

  return dbRow;
}

function mergeEnvWithRuntimeConfig(): Record<string, string | undefined> {
  const runtimeEnv = getRuntimeConfig().env;
  const runtimeRecord: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(runtimeEnv)) {
    runtimeRecord[key] = value;
  }

  return {
    ...process.env,
    ...runtimeRecord,
  };
}

function stripSecrets(
  manifest: ExtensionManifest,
  resolved: ResolvedExtension<Record<string, unknown>>
): ResolvedExtension<Record<string, unknown>> {
  const strippedConfig = { ...resolved.config };

  for (const [fieldName, fieldMeta] of Object.entries(manifest.configSchema.fields)) {
    if (fieldMeta.secret === true) {
      delete strippedConfig[fieldName];
    }
  }

  return {
    ...resolved,
    config: strippedConfig,
  };
}

export function clearExtensionRowMemo(id?: string): void {
  if (typeof id === 'string' && id.length > 0) {
    memoizedRows.delete(id);
    return;
  }

  memoizedRows.clear();
}

export async function resolveActiveExtensions(): Promise<ActiveExtension[]> {
  const env = mergeEnvWithRuntimeConfig();
  const masterSwitchEnabled = env.EXTENSIONS_ENABLED === 'true';
  if (masterSwitchEnabled === false) {
    return [];
  }

  const results: ActiveExtension[] = [];
  for (const manifest of extensionRegistry) {
    const dbRow = await readDbRow(manifest.id);
    const resolved = resolveExtensionConfig<Record<string, unknown>>({
      manifest,
      env,
      dbRow,
      masterSwitchEnabled: true,
    });

    if (resolved.enabled === true) {
      results.push({
        manifest,
        resolved: stripSecrets(manifest, resolved),
      });
    }
  }

  return results;
}
