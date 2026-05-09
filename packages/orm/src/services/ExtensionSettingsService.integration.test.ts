import { describe, expect, it } from 'vitest';

import { getDataSourceReadWrite } from '../context.js';
import { ExtensionSettingsService } from './ExtensionSettingsService.js';

describe('ExtensionSettingsService (integration)', () => {
  describe('findAll', () => {
    it('returns an empty array on an empty table', async () => {
      const ds = getDataSourceReadWrite();
      const result = await ExtensionSettingsService.findAll(ds);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('upsert', () => {
    it('inserts a new row and findById returns it', async () => {
      const ds = getDataSourceReadWrite();
      const id = `test-${Date.now()}`;
      const config = { key: 'value' };

      const inserted = await ExtensionSettingsService.upsert(ds, {
        id,
        enabled: true,
        config,
        updatedByAdminId: null,
      });

      expect(inserted.id).toBe(id);
      expect(inserted.enabled).toBe(true);
      expect(inserted.config).toEqual(config);
      expect(inserted.updatedByAdminId).toBe(null);

      const found = await ExtensionSettingsService.findById(ds, id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(id);
      expect(found?.enabled).toBe(true);
      expect(found?.config).toEqual(config);

      // Cleanup
      await ExtensionSettingsService.deleteById(ds, id);
    });

    it('updates enabled, config, and updatedByAdminId when a row exists', async () => {
      const ds = getDataSourceReadWrite();
      const id = `test-update-${Date.now()}`;
      const initialConfig = { initial: 'config' };
      const updatedConfig = { updated: 'config', nested: { obj: true } };

      const inserted = await ExtensionSettingsService.upsert(ds, {
        id,
        enabled: false,
        config: initialConfig,
        updatedByAdminId: null,
      });

      const insertedAt = inserted.updatedAt;
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await ExtensionSettingsService.upsert(ds, {
        id,
        enabled: true,
        config: updatedConfig,
        updatedByAdminId: 42,
      });

      expect(updated.id).toBe(id);
      expect(updated.enabled).toBe(true);
      expect(updated.config).toEqual(updatedConfig);
      expect(updated.updatedByAdminId).toBe(42);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(insertedAt.getTime());

      // Cleanup
      await ExtensionSettingsService.deleteById(ds, id);
    });

    it('round-trips arbitrary jsonb including nested objects', async () => {
      const ds = getDataSourceReadWrite();
      const id = `test-jsonb-${Date.now()}`;
      const complexConfig = {
        string: 'value',
        number: 42,
        boolean: true,
        nested: {
          deep: {
            array: [1, 2, 3],
            empty: {},
          },
        },
        emptyArray: [],
        emptyObject: {},
      };

      const inserted = await ExtensionSettingsService.upsert(ds, {
        id,
        enabled: false,
        config: complexConfig,
        updatedByAdminId: null,
      });

      expect(inserted.config).toEqual(complexConfig);

      const found = await ExtensionSettingsService.findById(ds, id);
      expect(found?.config).toEqual(complexConfig);

      // Cleanup
      await ExtensionSettingsService.deleteById(ds, id);
    });
  });

  describe('deleteById', () => {
    it('removes a row', async () => {
      const ds = getDataSourceReadWrite();
      const id = `test-delete-${Date.now()}`;

      await ExtensionSettingsService.upsert(ds, {
        id,
        enabled: true,
        config: {},
        updatedByAdminId: null,
      });

      let found = await ExtensionSettingsService.findById(ds, id);
      expect(found).toBeDefined();

      await ExtensionSettingsService.deleteById(ds, id);

      found = await ExtensionSettingsService.findById(ds, id);
      expect(found).toBeNull();
    });
  });
});
