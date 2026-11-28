import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const API_PLAYLIST_URL = 'http://localhost:4030/api/v2/playlist';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const PUBLIC_TITLE = 'A E2E Tag Row';
const PRIVATE_TITLE = 'A E2E Tag Private';
const PUBLIC_TAG_LINE = 'adam curry, podcasting-2.0';
const PRIVATE_TAG_LINE = 'news';
const REMOVED_PLAYLIST_HREF = '/playlist/e2eRemPlay01';

const expectAppPath = async (page: Page, path: string): Promise<void> => {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === path);
};

const readCreatedPlaylistIdText = (body: unknown): string => {
  if (typeof body !== 'object' || body === null || !('id_text' in body)) {
    throw new Error('Playlist create response is missing id_text');
  }
  const idText = body.id_text;
  if (typeof idText !== 'string' || idText.length === 0) {
    throw new Error('Playlist create response is missing id_text');
  }
  return idText;
};

const loginSeedUser = async (page: Page): Promise<void> => {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
};

const createTaggedPlaylist = async (
  page: Page,
  data: {
    title: string;
    description: string;
    medium: 'av';
    sharable_status_id: number;
    tags: string[];
  }
): Promise<string> => {
  const response = await page.request.post(API_PLAYLIST_URL, { data });
  const raw = await response.text();
  expect(response.status(), raw).toBe(201);
  const parsed: unknown = JSON.parse(raw);
  return readCreatedPlaylistIdText(parsed);
};

const expectTagLineBelowTitle = async (title: Locator, tags: Locator): Promise<void> => {
  const titleBox = await title.boundingBox();
  const tagsBox = await tags.boundingBox();
  expect(titleBox, 'title is in the layout').not.toBeNull();
  expect(tagsBox, 'tag line is in the layout').not.toBeNull();
  if (titleBox !== null && tagsBox !== null) {
    expect(tagsBox.y).toBeGreaterThan(titleBox.y);
  }
};

test.describe('Playlist row tags', () => {
  test('When a playlist has tags, My Playlists and Global each show those names on one line under the title.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const createdIdTexts: string[] = [];

    try {
      await test.step('Log in as the seeded E2E user.', async () => {
        await loginSeedUser(page);
      });

      const publicId = await createTaggedPlaylist(page, {
        title: PUBLIC_TITLE,
        description: '',
        medium: 'av',
        sharable_status_id: 1,
        tags: ['Adam Curry', 'podcasting-2.0'],
      });
      createdIdTexts.push(publicId);
      const privateId = await createTaggedPlaylist(page, {
        title: PRIVATE_TITLE,
        description: '',
        medium: 'av',
        sharable_status_id: 3,
        tags: ['news'],
      });
      createdIdTexts.push(privateId);

      const publicLink = page.locator(`a[href="/playlist/${publicId}"]`);
      const privateLink = page.locator(`a[href="/playlist/${privateId}"]`);
      const publicTags = publicLink.getByTestId(`playlist-row-tags-${publicId}`);
      const privateTags = page.getByTestId(`playlist-row-tags-${privateId}`);

      await test.step('My Playlists shows each tagged row on one line under its title, and a playlist with no tags has no tag line.', async () => {
        await page.goto('/playlists?type=private&sort=a_z');
        await expectAppPath(page, '/playlists?type=private&sort=a_z');
        await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();
        await expect(
          page
            .getByTestId('playlists-type-chips')
            .getByRole('button', { name: 'My Playlists', exact: true })
        ).toHaveAttribute('aria-pressed', 'true');

        await expect(publicTags).toBeVisible();
        await expect(publicTags).toHaveText(PUBLIC_TAG_LINE);
        await expect(privateTags).toBeVisible();
        await expect(privateTags).toHaveText(PRIVATE_TAG_LINE);

        const removedLink = page.locator(`a[href="${REMOVED_PLAYLIST_HREF}"]`);
        await expect(removedLink).toBeVisible();
        await expect(removedLink.getByTestId('playlist-row-tags-e2eRemPlay01')).toHaveCount(0);

        await expectTagLineBelowTitle(
          publicLink.getByText(PUBLIC_TITLE, { exact: true }),
          publicTags
        );
        await expectTagLineBelowTitle(
          privateLink.getByText(PRIVATE_TITLE, { exact: true }),
          privateTags
        );

        await expect(publicTags).toHaveCSS('text-overflow', 'ellipsis');
        await expect(publicTags).toHaveCSS('white-space', 'nowrap');
        await expect(publicLink.getByText(PUBLIC_TITLE, { exact: true })).toBeVisible();

        await capturePageLoad(
          page,
          testInfo,
          'My Playlists shows the public playlist tags on one line under the title.',
          publicTags
        );
      });

      await test.step('Global shows the public playlist tags under the title and does not show the private playlist.', async () => {
        await page.goto('/playlists?type=public&sort=recent');
        await expectAppPath(page, '/playlists?type=public&sort=recent');
        await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();
        await expect(
          page
            .getByTestId('playlists-type-chips')
            .getByRole('button', { name: 'Global', exact: true })
        ).toHaveAttribute('aria-pressed', 'true');

        await expect(publicTags).toBeVisible();
        await expect(publicTags).toHaveText(PUBLIC_TAG_LINE);
        await expectTagLineBelowTitle(
          publicLink.getByText(PUBLIC_TITLE, { exact: true }),
          publicTags
        );
        await expect(page.getByText(PRIVATE_TITLE, { exact: true })).toHaveCount(0);
        await expect(privateTags).toHaveCount(0);

        await capturePageLoad(
          page,
          testInfo,
          'Global shows the public playlist tags and hides the private playlist.',
          publicTags
        );
      });
    } finally {
      for (const idText of createdIdTexts) {
        await page.request.delete(`${API_PLAYLIST_URL}/${idText}`);
      }
    }
  });
});
