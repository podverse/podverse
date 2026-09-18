import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('FAQ page', () => {
  test('When opening /faq, the page shows a loading state then renders stable managed copy.', async ({
    page,
  }, testInfo) => {
    await page.route(
      '**/api/v2/managed-copy/faq',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.continue();
      },
      { times: 1 }
    );

    await page.goto('/faq');

    const loadingSpinner = page.getByLabel('Loading…');
    await expect(loadingSpinner).toBeVisible();

    const faqHeading = page.getByRole('heading', {
      name: 'Why do some clips start at the wrong time?',
    });
    await expect(faqHeading).toBeVisible();
    await expect(loadingSpinner).toBeHidden();

    const topBefore = await faqHeading.evaluate((node) => Math.round(node.getBoundingClientRect().top));
    await expect
      .poll(async () => faqHeading.evaluate((node) => Math.round(node.getBoundingClientRect().top)))
      .toBe(topBefore);

    await capturePageLoad(
      page,
      testInfo,
      'The FAQ page renders managed-copy content after loading without moving the heading.',
      faqHeading
    );
  });
});
