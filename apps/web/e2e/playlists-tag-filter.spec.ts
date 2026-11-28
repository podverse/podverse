import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const expectAppPath = async (page: Page, path: string): Promise<void> => {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
};

const expectTagQuery = async (page: Page, pathname: string, tag: string): Promise<void> => {
  await expect(page).toHaveURL(
    (url) => url.pathname === pathname && url.searchParams.get('tag') === tag
  );
};

test.describe('Public playlist tag filter', () => {
  test('When a signed-out visitor opens Playlists, they see a Tag button and the URL stays /playlists.', async ({
    page,
  }, testInfo) => {
    await page.goto('/playlists');
    await expectAppPath(page, '/playlists');
    await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();

    const tagButton = page
      .getByTestId('playlists-tag-filter')
      .getByRole('button', { name: 'Tag', exact: true });
    await expect(tagButton).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'A signed-out visitor sees the Tag button on Playlists.',
      tagButton
    );
  });

  test('When Playlists opens on a tag query, the button names that tag, and Clear Tag clears the name without removing the query.', async ({
    page,
  }, testInfo) => {
    await page.goto('/playlists?tag=Adam%20Curry');
    await expectTagQuery(page, '/playlists', 'Adam Curry');
    await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();

    const tagFilter = page.getByTestId('playlists-tag-filter');
    const applied = tagFilter.getByRole('button', { name: 'Tag: adam curry', exact: true });
    await expect(applied).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'The tag query names the button Tag: adam curry.',
      applied
    );

    await tagFilter.getByRole('button', { name: 'Clear Tag', exact: true }).click();
    const cleared = tagFilter.getByRole('button', { name: 'Tag', exact: true });
    await expect(cleared).toBeVisible();
    await expectTagQuery(page, '/playlists', 'Adam Curry');

    await capturePageLoad(
      page,
      testInfo,
      'Clear Tag renames the button to Tag and leaves the query in the URL.',
      cleared
    );
  });

  test('When the visitor chooses My Playlists or Subscribed, the tag filter hides, and Global shows it again.', async ({
    page,
  }, testInfo) => {
    await page.goto('/playlists');
    await expectAppPath(page, '/playlists');
    await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();

    const typeItems = page.getByTestId('playlists-type-chips-items');
    const trailing = page.getByTestId('playlists-type-chips-trailing');
    const sortButton = trailing.getByRole('button', { name: /^Sort: / });

    await typeItems.getByRole('button', { name: 'My Playlists', exact: true }).click();
    await expect(page.getByTestId('playlists-tag-filter')).toHaveCount(0);
    await expect(sortButton).toHaveAccessibleName('Sort: A-Z');

    await typeItems.getByRole('button', { name: 'Subscribed', exact: true }).click();
    await expect(page.getByTestId('playlists-tag-filter')).toHaveCount(0);

    await typeItems.getByRole('button', { name: 'Global', exact: true }).click();
    const tagButton = page
      .getByTestId('playlists-tag-filter')
      .getByRole('button', { name: 'Tag', exact: true });
    await expect(tagButton).toBeVisible();
    await expectAppPath(page, '/playlists');

    await capturePageLoad(
      page,
      testInfo,
      'Global shows the Tag button again after My Playlists and Subscribed hide it.',
      tagButton
    );
  });

  test('When Browse opens on Playlists, the tag filter is shown with Filter All and Sort Recent, and a tag query names the button.', async ({
    page,
  }, testInfo) => {
    await page.goto('/browse?tab=playlists');
    await expectAppPath(page, '/browse?tab=playlists');
    const playlistsChip = page
      .getByTestId('media-list-chips-items')
      .getByRole('button', { name: 'Playlists', exact: true });
    await expect(playlistsChip).toBeVisible();

    const trailing = page.getByTestId('media-list-chips-trailing');
    await expect(trailing.getByRole('button', { name: 'Filter: All', exact: true })).toBeVisible();
    await expect(trailing.getByRole('button', { name: /^Sort: / })).toHaveAccessibleName(
      'Sort: Recent'
    );
    const tagButton = page
      .getByTestId('playlists-tag-filter')
      .getByRole('button', { name: 'Tag', exact: true });
    await expect(tagButton).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Browse Playlists shows the Tag button with Filter All and Sort Recent.',
      tagButton
    );

    await page.goto('/browse?tab=playlists&tag=news');
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/browse' &&
        url.searchParams.get('tab') === 'playlists' &&
        url.searchParams.get('tag') === 'news'
    );
    await expect(playlistsChip).toBeVisible();
    const namedTag = page
      .getByTestId('playlists-tag-filter')
      .getByRole('button', { name: 'Tag: news', exact: true });
    await expect(namedTag).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'A tag query on Browse Playlists names the button Tag: news and keeps the playlists tab.',
      namedTag
    );
  });
});
