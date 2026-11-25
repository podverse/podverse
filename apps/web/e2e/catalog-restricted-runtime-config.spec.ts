import { expect, test } from '@playwright/test';

import { E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS } from './helpers/catalogRestricted';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Catalog-restricted lane runtime config', () => {
  test('When the catalog settings are set on the sidecar, the page receives them through runtime config.', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await expect(page).toHaveURL('/browse');

    const catalogRuntime = await page.evaluate(() => {
      const readRuntimeString = (record: object, key: string): string => {
        const value: unknown = Reflect.get(record, key);
        return typeof value === 'string' ? value : '';
      };

      const empty = { musicDisabled: '', addByRSSDisabled: '', allowlist: '' };
      const runtimeConfig: unknown = Reflect.get(globalThis, '__PODVERSE_RUNTIME_CONFIG__');
      if (typeof runtimeConfig !== 'object' || runtimeConfig === null) {
        return empty;
      }
      const env: unknown = Reflect.get(runtimeConfig, 'env');
      if (typeof env !== 'object' || env === null) {
        return empty;
      }
      return {
        musicDisabled: readRuntimeString(env, 'NEXT_PUBLIC_CATALOG_MUSIC_DISABLED'),
        addByRSSDisabled: readRuntimeString(env, 'NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED'),
        allowlist: readRuntimeString(env, 'NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST'),
      };
    });

    expect(catalogRuntime.musicDisabled).toBe('true');
    expect(catalogRuntime.addByRSSDisabled).toBe('true');
    expect(catalogRuntime.allowlist).toBe(E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS.join(','));

    await capturePageLoad(
      page,
      testInfo,
      'Home loads on the catalog-restricted lane with the catalog settings in runtime config.'
    );
  });
});
