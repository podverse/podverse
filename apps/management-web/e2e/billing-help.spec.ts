import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { capturePageLoad } from './helpers/stepScreenshots';

const ARTICLES = [
  {
    title: 'Gifting a Member',
    body: 'An admin grant adds time after whatever the member already has.',
  },
  {
    title: 'Apple Refund',
    body: 'Podverse cannot refund an App Store charge.',
  },
  {
    title: 'A Purchase Is Missing From the App',
    body: "Resync retries failed notifications, re-fetches the account's transactions, and applies refunds.",
  },
  {
    title: 'Purchase Linked to the Wrong Account',
    body: 'Store receipts attach to the Podverse account that purchased them.',
  },
] as const;

test.describe('Management-web billing help', () => {
  test('a superuser opens each of the four billing help articles', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await signIn(page);
    await page.goto(ROUTES.BILLING);
    await page.getByRole('link', { name: 'Billing Help' }).click();
    await expect(page.getByRole('heading', { name: 'Billing Help', level: 1 })).toBeVisible();

    const articleList = page
      .getByRole('list')
      .filter({ has: page.getByRole('link', { name: ARTICLES[0].title }) });
    await expect(articleList.getByRole('link')).toHaveCount(ARTICLES.length);
    await expect(page.getByRole('link', { name: 'Duplicate Subscription' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Member Wants to Switch Processor' })).toHaveCount(
      0
    );

    for (const article of ARTICLES) {
      await page.goto(ROUTES.BILLING_HELP);
      await page.getByRole('link', { name: article.title }).click();
      await expect(page.getByRole('heading', { name: article.title, level: 1 })).toBeVisible();
      await expect(page.getByText(article.body)).toBeVisible();
    }

    await capturePageLoad(
      page,
      testInfo,
      'billing-help-wrong-account',
      page.getByRole('heading', { name: ARTICLES[3].title, level: 1 })
    );
  });

  test('retired billing help slugs show the not-found page', async ({ page }, testInfo) => {
    test.setTimeout(45_000);
    await signIn(page);

    for (const slug of ['duplicates', 'processor-switch']) {
      await page.goto(`${ROUTES.BILLING_HELP}/${slug}`);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'This page could not be found.' })
      ).toBeVisible();
    }

    await capturePageLoad(
      page,
      testInfo,
      'billing-help-retired-slug',
      page.getByRole('heading', { name: '404' })
    );
  });
});

async function signIn(page: Page) {
  await page.goto(ROUTES.HOME);
  await page.locator('#email').fill('e2e-superadmin@example.com');
  await page.locator('#password').fill('Test!1Aa');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}
