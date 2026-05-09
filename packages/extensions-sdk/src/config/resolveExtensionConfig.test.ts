import joi from 'joi';
import { describe, expect, it } from 'vitest';

import type { ExtensionManifest } from '../types/manifest.js';
import { resolveExtensionConfig } from './resolveExtensionConfig.js';

const testManifest: ExtensionManifest = {
  id: 'test-ext',
  name: 'Test Extension',
  description: 'A test extension',
  kind: 'other',
  defaultEnabled: false,
  configSchema: {
    joi: joi.object({
      token: joi.string().required(),
      'beacon-url': joi.string().optional(),
    }),
    fields: {
      token: {
        secret: true,
        userEditable: false,
        labelKey: 'settings.token.label',
      },
      'beacon-url': {
        secret: false,
        userEditable: true,
        labelKey: 'settings.beaconUrl.label',
        helpKey: 'settings.beaconUrl.help',
      },
    },
  },
  requires: {},
};

describe('resolveExtensionConfig', () => {
  describe('master switch off', () => {
    it('returns disabled with empty config regardless of DB or env', () => {
      const result = resolveExtensionConfig<{ token: string; beaconUrl?: string }>({
        manifest: testManifest,
        env: {
          EXTENSION_TEST_EXT_ENABLED: 'true',
          EXTENSION_TEST_EXT_TOKEN: 'secret123',
        },
        dbRow: {
          enabled: true,
          config: { token: 'db-token', beaconUrl: 'https://db.example.com' },
        },
        masterSwitchEnabled: false,
      });

      expect(result.enabled).toBe(false);
      expect(result.config).toEqual({});
    });
  });

  describe('master switch on, DB row present', () => {
    it('returns enabled with DB config when dbRow.enabled=true', () => {
      const result = resolveExtensionConfig<{ token: string; 'beacon-url'?: string }>({
        manifest: testManifest,
        env: {},
        dbRow: {
          enabled: true,
          config: { token: 'db-token', 'beacon-url': 'https://db.example.com' },
        },
        masterSwitchEnabled: true,
      });

      expect(result.enabled).toBe(true);
      expect(result.config).toEqual({ token: 'db-token', 'beacon-url': 'https://db.example.com' });
    });

    it('returns disabled but still validates config when dbRow.enabled=false', () => {
      const result = resolveExtensionConfig<{ token: string; 'beacon-url'?: string }>({
        manifest: testManifest,
        env: {},
        dbRow: { enabled: false, config: { token: 'db-token' } },
        masterSwitchEnabled: true,
      });

      expect(result.enabled).toBe(false);
      expect(result.config).toEqual({ token: 'db-token' });
    });
  });

  describe('master switch on, no DB row', () => {
    it('returns disabled when env ENABLED key is missing', () => {
      const result = resolveExtensionConfig<{ token: string; 'beacon-url'?: string }>({
        manifest: testManifest,
        env: { EXTENSION_TEST_EXT_TOKEN: 'env-token' },
        dbRow: null,
        masterSwitchEnabled: true,
      });

      expect(result.enabled).toBe(false);
      expect(result.config).toEqual({});
    });

    it('returns disabled when env ENABLED=false', () => {
      const result = resolveExtensionConfig<{ token: string; 'beacon-url'?: string }>({
        manifest: testManifest,
        env: {
          EXTENSION_TEST_EXT_ENABLED: 'false',
          EXTENSION_TEST_EXT_TOKEN: 'env-token',
        },
        dbRow: null,
        masterSwitchEnabled: true,
      });

      expect(result.enabled).toBe(false);
      expect(result.config).toEqual({});
    });

    it('returns enabled with env config when env ENABLED=true', () => {
      const result = resolveExtensionConfig<{ token: string; 'beacon-url'?: string }>({
        manifest: testManifest,
        env: {
          EXTENSION_TEST_EXT_ENABLED: 'true',
          EXTENSION_TEST_EXT_TOKEN: 'env-token',
          EXTENSION_TEST_EXT_BEACON_URL: 'https://env.example.com',
        },
        dbRow: null,
        masterSwitchEnabled: true,
      });

      expect(result.enabled).toBe(true);
      expect(result.config).toEqual({
        token: 'env-token',
        'beacon-url': 'https://env.example.com',
      });
    });
  });

  describe('validation and stripUnknown', () => {
    it('throws on Joi validation error with manifest id in message', () => {
      expect(() =>
        resolveExtensionConfig({
          manifest: testManifest,
          env: {},
          dbRow: { enabled: true, config: {} },
          masterSwitchEnabled: true,
        })
      ).toThrow(/test-ext/);
    });

    it('drops extra keys from config (stripUnknown)', () => {
      const result = resolveExtensionConfig<{ token: string; 'beacon-url'?: string }>({
        manifest: testManifest,
        env: {},
        dbRow: {
          enabled: true,
          config: {
            token: 'test',
            'beacon-url': 'https://example.com',
            extraKey: 'should-be-dropped',
          },
        },
        masterSwitchEnabled: true,
      });

      expect(result.config).toEqual({ token: 'test', 'beacon-url': 'https://example.com' });
      expect('extraKey' in result.config).toBe(false);
    });
  });
});
