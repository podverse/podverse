import { expect, test } from '@playwright/test';

test.describe('Management-web feed operations', () => {
  test('a superuser can set and clear a feed spam item limit override', async ({ page }) => {
    test.setTimeout(45_000);

    const applyBodies: Record<string, unknown>[] = [];

    await page.route('**/feed-operations/options', async (route) => {
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

    await page.route('**/feed-operations/list**', async (route) => {
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

    await page.route('**/feed-operations/lookup**', async (route) => {
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

    // POST goes to management-api `/api/v2/feed-operations/update-policy-state`. Route only the API path.
    await page.route('**/api/v2/feed-operations/update-policy-state', async (route) => {
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

    await page.goto('/feed-operations/flag-status');
    await expect(page.getByRole('heading', { name: 'Set feed status', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feeds', level: 2 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Feed directory' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sort by ID' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Test Show' })).toBeVisible();

    await page.getByLabel('Search by').selectOption('podcast_index_id');
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
        feed_id: 9,
        lifecycle_state_key: 'active',
        active_condition_keys: [],
        spam_item_limit_override: 12345,
      })
    );

    await spamOverrideInput.fill('');
    await page.getByRole('button', { name: 'Apply change' }).click();

    await expect(page.getByText('Feed status was updated')).toBeVisible();
    expect(applyBodies[1]).toEqual(
      expect.objectContaining({
        feed_id: 9,
        lifecycle_state_key: 'active',
        active_condition_keys: [],
        spam_item_limit_override: null,
      })
    );
  });
});
