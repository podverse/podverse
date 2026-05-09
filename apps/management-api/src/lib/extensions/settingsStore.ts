import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@mgmt-api/orm/db/appDb.js';

import {
  deleteExtensionCacheKey,
  type ExtensionCacheClient,
  type ExtensionSetting,
  ExtensionSettingsService,
  publishExtensionInvalidation,
} from '@podverse/orm';

export async function listExtensionSettings(): Promise<ExtensionSetting[]> {
  return ExtensionSettingsService.findAll(AppDbDataSourceRead);
}

export async function getExtensionSettingById(id: string): Promise<ExtensionSetting | null> {
  return ExtensionSettingsService.findById(AppDbDataSourceRead, id);
}

export async function upsertExtensionSetting(input: {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedByAdminId: number | null;
}): Promise<ExtensionSetting> {
  return ExtensionSettingsService.upsert(AppDbDataSourceReadWrite, input);
}

export async function invalidateExtensionSettingCache(
  client: ExtensionCacheClient,
  id: string
): Promise<void> {
  await deleteExtensionCacheKey(client, id);
  await publishExtensionInvalidation(client, id);
}
