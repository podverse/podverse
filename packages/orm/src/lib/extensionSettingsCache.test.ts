/* eslint-disable @typescript-eslint/no-explicit-any -- Mocking client objects requires any */
import { describe, expect, it, vi } from 'vitest';

import {
  deleteExtensionCacheKey,
  EXTENSION_CACHE_TTL_SECONDS,
  EXTENSION_INVALIDATION_CHANNEL,
  extensionCacheKey,
  publishExtensionInvalidation,
  readCachedExtensionSetting,
  subscribeToExtensionInvalidations,
  writeCachedExtensionSetting,
} from './extensionSettingsCache.js';

describe('extensionSettingsCache', () => {
  describe('extensionCacheKey', () => {
    it('generates a cache key from extension id', () => {
      const key = extensionCacheKey('cloudflare-web-analytics');
      expect(key).toBe('extension:cloudflare-web-analytics');
    });
  });

  describe('readCachedExtensionSetting', () => {
    it('returns null when key does not exist', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue(null),
      };
      const result = await readCachedExtensionSetting(mockClient as any, 'test-id');
      expect(result).toBeNull();
    });

    it('returns null when cached value is null sentinel', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue('__null__'),
      };
      const result = await readCachedExtensionSetting(mockClient as any, 'test-id');
      expect(result).toBeNull();
    });

    it('returns parsed extension setting from cache', async () => {
      const setting = { enabled: true, config: { token: 'abc123' } };
      const mockClient = {
        get: vi.fn().mockResolvedValue(JSON.stringify(setting)),
      };
      const result = await readCachedExtensionSetting(mockClient as any, 'test-id');
      expect(result).toEqual(setting);
    });

    it('returns null on parse error', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue('invalid json'),
      };
      const result = await readCachedExtensionSetting(mockClient as any, 'test-id');
      expect(result).toBeNull();
    });
  });

  describe('writeCachedExtensionSetting', () => {
    it('writes null as sentinel', async () => {
      const mockClient = {
        setex: vi.fn().mockResolvedValue('OK'),
      };
      await writeCachedExtensionSetting(mockClient as any, 'test-id', null);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'extension:test-id',
        EXTENSION_CACHE_TTL_SECONDS,
        '__null__'
      );
    });

    it('writes extension setting as JSON with TTL', async () => {
      const setting = { enabled: true, config: { token: 'abc123' } };
      const mockClient = {
        setex: vi.fn().mockResolvedValue('OK'),
      };
      await writeCachedExtensionSetting(mockClient as any, 'test-id', setting);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'extension:test-id',
        EXTENSION_CACHE_TTL_SECONDS,
        JSON.stringify(setting)
      );
    });

    it('silently fails on error', async () => {
      const mockClient = {
        setex: vi.fn().mockRejectedValue(new Error('Redis error')),
      };
      // Should not throw
      await writeCachedExtensionSetting(mockClient as any, 'test-id', {
        enabled: false,
        config: {},
      });
    });
  });

  describe('publishExtensionInvalidation', () => {
    it('publishes to invalidation channel with id as message', async () => {
      const mockClient = {
        publish: vi.fn().mockResolvedValue(1),
      };
      await publishExtensionInvalidation(mockClient as any, 'test-id');
      expect(mockClient.publish).toHaveBeenCalledWith(
        `${EXTENSION_INVALIDATION_CHANNEL}:test-id`,
        'test-id'
      );
    });

    it('silently fails on error', async () => {
      const mockClient = {
        publish: vi.fn().mockRejectedValue(new Error('Redis error')),
      };
      // Should not throw
      await publishExtensionInvalidation(mockClient as any, 'test-id');
    });
  });

  describe('deleteExtensionCacheKey', () => {
    it('deletes the cache key', async () => {
      const mockClient = {
        del: vi.fn().mockResolvedValue(1),
      };
      await deleteExtensionCacheKey(mockClient as any, 'test-id');
      expect(mockClient.del).toHaveBeenCalledWith('extension:test-id');
    });

    it('silently fails on error', async () => {
      const mockClient = {
        del: vi.fn().mockRejectedValue(new Error('Redis error')),
      };
      // Should not throw
      await deleteExtensionCacheKey(mockClient as any, 'test-id');
    });
  });

  describe('subscribeToExtensionInvalidations', () => {
    it('subscribes to pattern and sets up message handler', async () => {
      const onInvalidate = vi.fn().mockResolvedValue(undefined);
      const mockClient = {
        psubscribe: vi.fn().mockResolvedValue(null),
        on: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
      };

      await subscribeToExtensionInvalidations(mockClient as any, onInvalidate);

      expect(mockClient.psubscribe).toHaveBeenCalledWith(`${EXTENSION_INVALIDATION_CHANNEL}:*`);
      expect(mockClient.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
    });

    it('silently fails on subscribe error', async () => {
      const mockClient = {
        psubscribe: vi.fn().mockRejectedValue(new Error('Redis error')),
      };
      // Should not throw
      await subscribeToExtensionInvalidations(mockClient as any, async () => {});
    });
  });
});
