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
          feed_flag_statuses: [{ id: 1, status: 'active' }],
          feed_flag_status_reasons: [{ id: 1, reason: 'spam' }],
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
            feed_flag_status_id: 1,
            feed_flag_status_key: 'active',
            feed_flag_status_reason_id: null,
            feed_flag_status_reason_key: null,
            feed_flag_status_reason_note: null,
            channel_title: 'Test Show',
          },
        }),
      });
    });

    await page.route('**/feed-operations/flag-status', async (route) => {
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

    await page.getByLabel('Search by').selectOption('podcast_index_id');
    await page.getByLabel('Value').fill('55');
    await page.getByRole('button', { name: 'Look up' }).click();

    await expect(page.getByText('Spam item limit override')).toBeVisible();
    const spamOverrideInput = page.getByRole('spinbutton', {
      name: 'Spam item limit override (optional)',
    });
    await expect(spamOverrideInput).toHaveValue('777');
    await spamOverrideInput.fill('12345');
    await page.getByRole('button', { name: 'Apply change' }).click();

    await expect(page.getByText('Feed status was updated')).toBeVisible();
    expect(applyBodies[0]).toEqual(
      expect.objectContaining({
        feed_id: 9,
        spam_item_limit_override: 12345,
      })
    );

    await spamOverrideInput.fill('');
    await page.getByRole('button', { name: 'Apply change' }).click();

    await expect(page.getByText('Feed status was updated')).toBeVisible();
    expect(applyBodies[1]).toEqual(
      expect.objectContaining({
        feed_id: 9,
        spam_item_limit_override: null,
      })
    );
  });
});
