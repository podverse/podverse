import { expect, test } from '@playwright/test';

import { E2E_PODCAST_CHANNEL_ID_TEXT, E2E_PODCAST_CHANNEL_TITLE } from './helpers/seedConstants';
import { actionAndCapture } from './helpers/stepScreenshots';

test.describe('Main layout navbar chrome', () => {
  test('the home page shows the account menu and no history controls on a wide viewport', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await actionAndCapture(
      page,
      testInfo,
      'The wide home page shows the account menu and no Back or Forward buttons.',
      async () => {
        await page.goto('/');
        const chrome = page.locator('[data-appearance="web"]');
        await expect(chrome).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Account' })).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Back' })).toHaveCount(0);
        await expect(chrome.getByRole('button', { name: 'Forward' })).toHaveCount(0);
      },
      page.locator('[data-appearance="web"]')
    );
  });

  test('the sidebar shows Subscribed, Browse, and an expanded Library', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await actionAndCapture(
      page,
      testInfo,
      'The wide home page shows Subscribed, Browse, and an expanded Library.',
      async () => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/$/);
        const sections = page.locator('#sidebar details');
        await expect(sections).toHaveCount(1);
        await expect(sections).toHaveJSProperty('open', true);
        await expect(
          page.locator('#sidebar a[href="/"]').filter({ hasText: 'Subscribed' })
        ).toBeVisible();
        await expect(page.locator('#sidebar a[href="/browse"]')).toBeVisible();
        await expect(page.locator('#sidebar a[href="/add-by-rss"]')).toBeVisible();
        await expect(page.locator('#sidebar a[href="/playlists"]')).toBeVisible();
        await expect(page.locator('#sidebar a[href="/podcasts"]')).toHaveCount(0);
        await expect(page.locator('#sidebar a[href="/profiles"]')).toHaveCount(0);
      },
      page.locator('#sidebar')
    );
  });

  test('the sidebar marks the page you are on and stays unmarked on a podcast page', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const subscribed = page.locator('#sidebar a[href="/"]').filter({ hasText: 'Subscribed' });
    const browse = page.locator('#sidebar a[href="/browse"]');

    await test.step('The home page marks Subscribed as the current page.', async () => {
      await actionAndCapture(
        page,
        testInfo,
        'The home page marks Subscribed in the sidebar as the current page.',
        async () => {
          await page.goto('/');
          await expect(page).toHaveURL(/\/$/);
          await expect(subscribed).toHaveAttribute('aria-current', 'page');
          await expect(browse).not.toHaveAttribute('aria-current', 'page');
        },
        subscribed
      );
    });

    await test.step('The Browse page marks Browse as the current page.', async () => {
      await actionAndCapture(
        page,
        testInfo,
        'The Browse page marks Browse in the sidebar as the current page.',
        async () => {
          await page.goto('/browse');
          await expect(page).toHaveURL(/\/browse$/);
          await expect(browse).toHaveAttribute('aria-current', 'page');
          await expect(subscribed).not.toHaveAttribute('aria-current', 'page');
        },
        browse
      );
    });

    await test.step('A podcast page leaves every sidebar row unmarked.', async () => {
      const podcastHeading = page.getByRole('heading', {
        level: 1,
        name: E2E_PODCAST_CHANNEL_TITLE,
      });
      await actionAndCapture(
        page,
        testInfo,
        'The seeded podcast page leaves the sidebar without a current page.',
        async () => {
          await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
          await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));
          await expect(podcastHeading).toBeVisible();
          await expect(page.locator('#sidebar [aria-current="page"]')).toHaveCount(0);
        },
        page.locator('#sidebar')
      );
    });
  });

  test('a narrow viewport shows search, the mobile menu toggle in its closed state', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await actionAndCapture(
      page,
      testInfo,
      'The narrow home page shows search and the closed mobile menu toggle.',
      async () => {
        await page.goto('/');
        const chrome = page.locator('[data-appearance="web"]');
        await expect(chrome.getByRole('link', { name: 'Search' })).toBeVisible();
        await expect(chrome.getByRole('button', { name: 'Open Menu' })).toBeVisible();
      },
      page.locator('[data-appearance="web"]')
    );
  });

  test('a wide viewport shows the Settings page title in the top bar as the only level-1 heading', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const chrome = page.locator('[data-appearance="web"]');
    const barTitle = chrome.getByRole('heading', { level: 1, name: 'Settings' });
    await actionAndCapture(
      page,
      testInfo,
      'The wide Settings page shows Settings in the top bar and exposes exactly one level-1 heading.',
      async () => {
        await page.goto('/settings');
        await expect(page).toHaveURL(/\/settings$/);
        await expect(barTitle).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      },
      barTitle
    );
  });

  test('a narrow viewport shows the Settings page title as its own row under the top bar', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const chrome = page.locator('[data-appearance="web"]');
    const pageTitle = page.getByRole('heading', { level: 1, name: 'Settings' });
    await actionAndCapture(
      page,
      testInfo,
      'The narrow Settings page shows the Settings title below the top bar and no title inside the bar.',
      async () => {
        await page.goto('/settings');
        await expect(page).toHaveURL(/\/settings$/);
        await expect(pageTitle).toBeVisible();
        await expect(chrome.getByRole('heading')).toHaveCount(0);
        const chromeBox = await chrome.boundingBox();
        const titleBox = await pageTitle.boundingBox();
        expect(chromeBox).not.toBeNull();
        expect(titleBox).not.toBeNull();
        if (chromeBox !== null && titleBox !== null) {
          expect(titleBox.y).toBeGreaterThanOrEqual(chromeBox.y + chromeBox.height);
        }
      },
      pageTitle
    );
  });

  test('the top bar title follows client navigation and stays empty on a podcast detail page', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const chrome = page.locator('[data-appearance="web"]');

    await test.step('The wide Settings page shows Settings in the top bar.', async () => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/settings$/);
      await expect(chrome.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    });

    await test.step('Clicking Browse in the sidebar changes the top bar title to Browse.', async () => {
      const browseTitle = chrome.getByRole('heading', { level: 1, name: 'Browse' });
      await actionAndCapture(
        page,
        testInfo,
        'After clicking Browse in the sidebar, the top bar title reads Browse.',
        async () => {
          await page.locator('#sidebar a[href="/browse"]').click();
          await expect(page).toHaveURL(/\/browse$/);
          await expect(browseTitle).toBeVisible();
        },
        browseTitle
      );
    });

    await test.step('The seeded podcast page shows no title in the top bar and keeps its own heading.', async () => {
      const podcastHeading = page.getByRole('heading', {
        level: 1,
        name: E2E_PODCAST_CHANNEL_TITLE,
      });
      await actionAndCapture(
        page,
        testInfo,
        'The seeded podcast page has no top bar title, and the podcast header shows the podcast name.',
        async () => {
          await page.goto(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
          await expect(page).toHaveURL(new RegExp(`/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`));
          await expect(podcastHeading).toBeVisible();
          await expect(chrome.getByRole('heading')).toHaveCount(0);
        },
        podcastHeading
      );
    });
  });

  test('pages with a header and no list show their title in the top bar on a wide viewport', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const chrome = page.locator('[data-appearance="web"]');
    const pages = [
      { path: '/terms', title: 'Terms' },
      { path: '/membership', title: 'Membership' },
      { path: '/sign-up', title: 'Sign Up' },
    ];

    for (const { path, title } of pages) {
      await test.step(`The ${path} page shows ${title} in the top bar.`, async () => {
        const barTitle = chrome.getByRole('heading', { level: 1, name: title, exact: true });
        await actionAndCapture(
          page,
          testInfo,
          `The wide ${path} page shows ${title} as the top bar title.`,
          async () => {
            await page.goto(path);
            await expect(page).toHaveURL(new RegExp(`${path}$`));
            await expect(barTitle).toBeVisible();
          },
          barTitle
        );
      });
    }
  });
});
