import { config } from '@mgmt-api/config/index.js';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { getExtensionCacheClient } from '@mgmt-api/lib/extensions/cacheClient.js';
import { extensionRegistry } from '@mgmt-api/lib/extensions/registry.js';
import {
  getExtensionSettingById,
  listExtensionSettings,
  upsertExtensionSetting,
} from '@mgmt-api/lib/extensions/settingsStore.js';
import { getParamRequired } from '@mgmt-api/lib/params.js';
import express from 'express';

import {
  type ExtensionManifest,
  type ResolvedExtension,
  resolveExtensionConfig,
} from '@podverse/extensions-sdk';
import { deleteExtensionCacheKey, publishExtensionInvalidation } from '@podverse/orm';

import { extensionPutBodySchema } from '../schemas/extensions.js';

const router = express.Router();

type ExtensionListItem = {
  id: string;
  name: string;
  description: string;
  kind: string;
  enabled: boolean;
  updatedAt: Date | null;
  updatedByAdminId: number | null;
};

function findManifestById(id: string): ExtensionManifest | undefined {
  return extensionRegistry.find((manifest) => manifest.id === id);
}

function extensionsMasterSwitchEnabled(): boolean {
  return process.env.EXTENSIONS_ENABLED === 'true';
}

function safeResolveExtension(
  manifest: ExtensionManifest,
  row: { enabled: boolean; config: Record<string, unknown> } | null
): ResolvedExtension<Record<string, unknown>> {
  try {
    return resolveExtensionConfig<Record<string, unknown>>({
      manifest,
      env: process.env,
      dbRow: row,
      masterSwitchEnabled: extensionsMasterSwitchEnabled(),
    });
  } catch {
    return {
      enabled: false,
      config: {},
    };
  }
}

function sanitizeConfigForResponse(
  manifest: ExtensionManifest,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [fieldName, value] of Object.entries(raw)) {
    const meta = manifest.configSchema.fields[fieldName];
    if (meta?.secret === true) {
      continue;
    }
    sanitized[fieldName] = value;
  }
  return sanitized;
}

function extensionListItemFromParts(
  id: string,
  manifest: ExtensionManifest | undefined,
  row: {
    enabled: boolean;
    config: Record<string, unknown>;
    updatedAt: Date;
    updatedByAdminId: number | null;
  } | null
): ExtensionListItem {
  const resolved = manifest ? safeResolveExtension(manifest, row) : null;
  return {
    id,
    name: manifest?.name ?? id,
    description: manifest?.description ?? '',
    kind: manifest?.kind ?? 'other',
    enabled: row?.enabled ?? resolved?.enabled ?? false,
    updatedAt: row?.updatedAt ?? null,
    updatedByAdminId: row?.updatedByAdminId ?? null,
  };
}

router.get('/', ensureAuthenticated, requireCrud('extensions', 'read'), async (_req, res, next) => {
  try {
    const rows = await listExtensionSettings();
    const rowMap = new Map(rows.map((row) => [row.id, row]));
    const ids = new Set<string>();

    for (const manifest of extensionRegistry) {
      ids.add(manifest.id);
    }
    for (const row of rows) {
      ids.add(row.id);
    }

    const entries = Array.from(ids)
      .sort((a, b) => a.localeCompare(b))
      .map((id) => extensionListItemFromParts(id, findManifestById(id), rowMap.get(id) ?? null));

    res.json({ extensions: entries });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id',
  ensureAuthenticated,
  requireCrud('extensions', 'read'),
  async (req, res, next) => {
    try {
      const id = getParamRequired(req, 'id');
      const manifest = findManifestById(id);
      if (!manifest) {
        res.status(404).json({ message: 'Extension not found' });
        return;
      }

      const row = await getExtensionSettingById(id);
      const resolved = safeResolveExtension(
        manifest,
        row
          ? {
              enabled: row.enabled,
              config: row.config,
            }
          : null
      );

      const dbConfig = row ? sanitizeConfigForResponse(manifest, row.config) : null;
      const resolvedConfig = sanitizeConfigForResponse(manifest, resolved.config);

      res.json({
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        kind: manifest.kind,
        enabled: row?.enabled ?? resolved.enabled,
        resolved: {
          enabled: resolved.enabled,
          config: resolvedConfig,
        },
        config: dbConfig,
        updatedAt: row?.updatedAt ?? null,
        updatedByAdminId: row?.updatedByAdminId ?? null,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  ensureAuthenticated,
  requireCrud('extensions', 'update'),
  async (req, res, next) => {
    try {
      const id = getParamRequired(req, 'id');
      const manifest = findManifestById(id);
      if (!manifest) {
        res.status(404).json({ message: 'Extension not found' });
        return;
      }

      const parsedBody = extensionPutBodySchema.validate(req.body);
      if (parsedBody.error) {
        res.status(400).json({ message: parsedBody.error.message });
        return;
      }

      const validatedConfigResult = manifest.configSchema.joi.validate(parsedBody.value.config, {
        stripUnknown: true,
      });
      if (validatedConfigResult.error) {
        res.status(400).json({ message: validatedConfigResult.error.message });
        return;
      }

      if (
        typeof validatedConfigResult.value !== 'object' ||
        validatedConfigResult.value === null ||
        Array.isArray(validatedConfigResult.value)
      ) {
        res.status(400).json({ message: 'Invalid config payload' });
        return;
      }

      const updatedByAdminId = req.user?.id ?? null;
      const saved = await upsertExtensionSetting({
        id,
        enabled: parsedBody.value.enabled,
        config: validatedConfigResult.value,
        updatedByAdminId,
      });

      const cacheClient = await getExtensionCacheClient();
      if (cacheClient) {
        await deleteExtensionCacheKey(cacheClient, id);
        await publishExtensionInvalidation(cacheClient, id);
      }

      res.json(saved);
    } catch (error) {
      next(error);
    }
  }
);

const extensionsRoot = express.Router();
extensionsRoot.use(`${config.api.prefix}${config.api.version}/extensions`, router);

export const extensionsRouter = extensionsRoot;
