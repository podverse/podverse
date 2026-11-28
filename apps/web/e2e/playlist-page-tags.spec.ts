import { expect, test } from '@playwright/test';

import { buildPlaylistPath } from '@podverse/helpers';

import {
  E2E_EMBED_PLAYLIST_ID_TEXT,
  E2E_EMBED_PLAYLIST_MIXED_ID_TEXT,
  E2E_EMBED_PLAYLIST_TAG_ADAM,
  E2E_EMBED_PLAYLIST_TAG_PODCASTING,
} from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

const PLAYLIST_AUDIO_HEADING = 'Playlist (audio)';
const PLAYLIST_MIXED_HEADING = 'Playlist (mixed)';

test.describe('Playlist page tags', () => {
  test('When a signed-out visitor opens the public audio playlist, they see its tags in owner order and the chips are not buttons.', async ({
    page,
  }, testInfo) => {
    const playlistPath = buildPlaylistPath(E2E_EMBED_PLAYLIST_ID_TEXT);
    await page.goto(playlistPath);
    await expect(page).toHaveURL(new RegExp(`${playlistPath}$`));
    await expect(
      page.getByRole('heading', { name: PLAYLIST_AUDIO_HEADING, exact: true })
    ).toBeVisible();

    const tags = page.getByTestId('playlist-page-tags');
    await expect(tags.getByRole('listitem')).toHaveText([
      E2E_EMBED_PLAYLIST_TAG_ADAM,
      E2E_EMBED_PLAYLIST_TAG_PODCASTING,
    ]);
    await expect(tags.getByRole('button')).toHaveCount(0);
    await capturePageLoad(page, testInfo, 'The public audio playlist shows its tags.', tags);
  });

  test('When a signed-out visitor opens the mixed playlist, the page does not list tags.', async ({
    page,
  }, testInfo) => {
    const playlistPath = buildPlaylistPath(E2E_EMBED_PLAYLIST_MIXED_ID_TEXT);
    await page.goto(playlistPath);
    await expect(page).toHaveURL(new RegExp(`${playlistPath}$`));
    const heading = page.getByRole('heading', { name: PLAYLIST_MIXED_HEADING, exact: true });
    await expect(heading).toBeVisible();
    await expect(page.getByTestId('playlist-page-tags')).toHaveCount(0);
    await capturePageLoad(page, testInfo, 'The mixed playlist does not list tags.', heading);
  });
});
