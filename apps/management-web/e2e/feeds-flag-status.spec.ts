import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Management-web feeds flag status', () => {
  test('dashboard shows a Feeds card linking to the feeds hub', async ({ page }, testInfo) => {
    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    const feedsCard = page.getByRole('link', { name: 'Feeds' });
    await expect(feedsCard).toBeVisible();
    await expect(feedsCard).toHaveAttribute('href', '/feeds');

    await capturePageLoad(
      page,
      testInfo,
      'The dashboard shows a Feeds card linking to the feeds hub.',
      feedsCard
    );
  });

  test('a superuser can set and clear a feed spam item limit override', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    const applyBodies: Record<string, unknown>[] = [];

    await page.route('**/feeds/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lifecycle_states: [{ state_key: 'active' }],
          condition_types: [{ condition_key: 'spam_detected' }],
          takedown_reasons: [{ reason: 'spam' }],
        }),
      });
    });

    await page.route('**/api/v2/feeds?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feeds: [
            {
              id: 9,
              url: 'https://example.com/feed.xml',
              podcast_index_id: 55,
              spam_item_limit_override: 777,
              max_response_body_bytes_override: null,
              lifecycle_state_key: 'active',
              lifecycle_reason: null,
              updated_source: 'system',
              active_condition_keys: [],
              parse_allowed: true,
              public_visible: true,
              add_allowed: true,
              primary_block_reason: null,
              policy_overrides: null,
              channel_title: 'Test Show',
            },
          ],
          pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/feeds/lookup**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feed: {
            id: 9,
            url: 'https://example.com/feed.xml',
            podcast_index_id: 55,
            spam_item_limit_override: 777,
            max_response_body_bytes_override: null,
            lifecycle_state_key: 'active',
            lifecycle_reason: null,
            updated_source: 'system',
            active_condition_keys: [],
            parse_allowed: true,
            public_visible: true,
            add_allowed: true,
            primary_block_reason: null,
            policy_overrides: null,
            channel_title: 'Test Show',
          },
        }),
      });
    });

    // PATCH goes to management-api `/api/v2/feeds/:id/policy-state`. Route only the API path.
    await page.route('**/api/v2/feeds/*/policy-state', async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      applyBodies.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: body }),
      });
    });

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/feeds');
    await expect(page.getByRole('heading', { name: 'Feeds', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Flag status' }).click();
    await expect(page).toHaveURL(/\/feeds\/flag-status$/);
    await expect(page.getByRole('heading', { name: 'Set feed status', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search Feeds' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Find a Feed' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Feed directory' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort by ID' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Test Show' })).toBeVisible();
    await page.getByRole('button', { name: 'Find a Feed' }).click();
    await expect(page.locator('#feed-flag-lookup-mode')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Feed directory' })).toHaveCount(0);

    await page.locator('#feed-flag-lookup-mode').click();
    await page.getByRole('menuitem', { name: 'Podcast Index ID' }).click();
    await page.getByLabel('Value').fill('55');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    // FormLabel may not wire htmlFor to Input; prefer stable name attribute over spinbutton role.
    const spamOverrideInput = page.locator('input[name="spam-item-limit-override"]');
    await expect(spamOverrideInput).toBeVisible();
    await expect(spamOverrideInput).toHaveValue('777');
    await spamOverrideInput.fill('12345');
    await page.getByRole('button', { name: 'Apply change' }).click();

    await expect(page.getByText('Feed status was updated')).toBeVisible();
    expect(applyBodies[0]).toEqual(
      expect.objectContaining({
        lifecycle_state_key: 'active',
        active_condition_keys: [],
        spam_item_limit_override: 12345,
      })
    );

    await capturePageLoad(
      page,
      testInfo,
      'Applying a spam item limit override shows the success message.',
      page.getByText('Feed status was updated')
    );

    await spamOverrideInput.fill('');
    await page.getByRole('button', { name: 'Apply change' }).click();

    await expect(page.getByText('Feed status was updated')).toBeVisible();
    expect(applyBodies[1]).toEqual(
      expect.objectContaining({
        lifecycle_state_key: 'active',
        active_condition_keys: [],
        spam_item_limit_override: null,
      })
    );

    await capturePageLoad(
      page,
      testInfo,
      'Clearing the spam item limit override persists on the flag status form.',
      spamOverrideInput
    );
  });

  test('the feeds directory table stays mounted while the lifecycle filter refetches the list', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/feeds/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lifecycle_states: [{ state_key: 'active' }, { state_key: 'pending_archive' }],
          condition_types: [{ condition_key: 'spam_detected' }],
          takedown_reasons: [{ reason: 'spam' }],
        }),
      });
    });

    const feedPayload = {
      id: 9,
      url: 'https://example.com/feed.xml',
      podcast_index_id: 55,
      spam_item_limit_override: null,
      max_response_body_bytes_override: null,
      lifecycle_state_key: 'active',
      lifecycle_reason: null,
      updated_source: 'system',
      active_condition_keys: [],
      parse_allowed: true,
      public_visible: true,
      add_allowed: true,
      primary_block_reason: null,
      policy_overrides: null,
      channel_title: 'Layout Test Show',
    };

    // Match GET …/api/v2/feeds?<query>. Branch on lifecycle vs probe (limit=1, no lifecycle)
    // so filtered-empty does not trip global system-empty (probe must report total > 0).
    await page.route(/\/api\/v2\/feeds\?/, async (route) => {
      const url = new URL(route.request().url());
      const lifecycle = url.searchParams.get('lifecycle');
      const limit = url.searchParams.get('limit') ?? '25';

      if (lifecycle === 'pending_archive') {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 900);
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeds: [],
            pagination: {
              page: 1,
              limit: Number(limit) || 25,
              total: 0,
              totalPages: 1,
            },
          }),
        });
        return;
      }

      if (limit === '1') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeds: [feedPayload],
            pagination: {
              page: 1,
              limit: 1,
              total: 1,
              totalPages: 1,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feeds: [feedPayload],
          pagination: {
            page: 1,
            limit: Number(limit) || 25,
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/feeds');
    await page.getByRole('link', { name: 'Flag status' }).click();
    await expect(page).toHaveURL(/\/feeds\/flag-status$/);
    await expect(page.getByRole('heading', { name: 'Search Feeds', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort by ID' })).toBeVisible();

    await page.locator('#feed-directory-lifecycle').click();
    await page.getByRole('menuitem', { name: 'pending_archive' }).click();

    // Refetch shows the probe gate spinner; filtered-empty then runs an unscoped probe (same loading label).
    // Wait until directory chrome is back instead of coupling to aria-busy (PageSection unmounts during gates).
    await expect(page.getByRole('region', { name: 'Feed directory' })).toBeVisible({
      timeout: 20_000,
    });
    // Filtered-empty lists omit the sortable `<thead>` (no rows); assert directory chrome + empty copy instead.
    await expect(page.getByText('No feeds match the current filters.')).toBeVisible();
    await expect(page.locator('#feed-directory-lifecycle')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Feed directory' })).not.toHaveAttribute(
      'aria-busy'
    );

    await capturePageLoad(
      page,
      testInfo,
      'After lifecycle filter refetch, the feed directory shows the filtered-empty message.',
      page.getByText('No feeds match the current filters.')
    );
  });

  test('when no feeds exist globally the page shows only the system-empty status (no directory or find sections)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);

    await page.route('**/feeds/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lifecycle_states: [{ state_key: 'active' }],
          condition_types: [{ condition_key: 'spam_detected' }],
          takedown_reasons: [{ reason: 'spam' }],
        }),
      });
    });

    await page.route('**/api/v2/feeds?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feeds: [],
          pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
        }),
      });
    });

    await page.goto('/');

    await page.locator('#email').fill('e2e-superadmin@example.com');
    await page.locator('#password').fill('Test!1Aa');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/feeds');
    await page.getByRole('link', { name: 'Flag status' }).click();
    await expect(page).toHaveURL(/\/feeds\/flag-status$/);
    await expect(page.getByRole('heading', { name: 'Set feed status', level: 1 })).toBeVisible();

    await expect(page.getByRole('status')).toContainText(/No data found yet/i);
    await expect(page.getByRole('button', { name: 'Search Feeds' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Find a Feed' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Feeds', level: 2 })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Find a Feed', level: 2 })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Feed directory' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'When no feeds exist globally, flag status shows only the system-empty status.',
      page.getByRole('status')
    );
  });
});
