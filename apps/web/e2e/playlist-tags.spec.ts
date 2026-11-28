import type { Locator, Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';
const TAG_LIMIT_SENTENCE = 'A playlist has at most 5 tags.';
const TAG_SEARCH_ERROR =
  'Something went wrong. Please try again later, or contact support for assistance.';

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function tagStamp(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function foldedTag(typed: string): string {
  return typed.replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeForUrl(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tagsCombobox(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Tags' });
}

function removeTagButton(page: Page, tag: string): Locator {
  return page.getByRole('button', { name: `Remove ${tag}`, exact: true });
}

function submitButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Submit', exact: true });
}

async function openCreateForm(page: Page, testInfo: TestInfo): Promise<Locator> {
  const heading = page.getByRole('heading', { name: 'Create Playlist', exact: true });
  await page.goto('/playlist/create');
  await expect(page).toHaveURL(/\/playlist\/create$/);
  await expect(heading).toBeVisible();
  await capturePageLoad(page, testInfo, 'The playlist create form is open.', heading);
  return heading;
}

async function addTagWithEnter(page: Page, typed: string): Promise<void> {
  const combobox = tagsCombobox(page);
  await combobox.fill(typed);
  await combobox.press('Enter');
  await expect(removeTagButton(page, typed)).toBeVisible();
}

async function fillTitle(page: Page, title: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
}

async function submitAndReadPlaylistId(
  page: Page,
  testInfo: TestInfo,
  title: string
): Promise<string> {
  const heading = page.getByRole('heading', { level: 1, name: title, exact: true });
  await actionAndCapture(
    page,
    testInfo,
    `The playlist page shows ${title}.`,
    async () => {
      await submitButton(page).click();
      await expect(page).toHaveURL(/\/playlist\/(?!create$)[^/]+$/);
      await expect(heading).toBeVisible();
    },
    heading
  );
  const idText = new URL(page.url()).pathname.split('/').pop();
  if (idText === undefined || idText === '' || idText === 'create') {
    throw new Error(`Playlist page URL did not include an id: ${page.url()}`);
  }
  return idText;
}

async function openEditForm(page: Page, testInfo: TestInfo, idText: string): Promise<Locator> {
  const heading = page.getByRole('heading', { name: 'Edit Playlist', exact: true });
  await page.goto(`/playlist/edit/${idText}`);
  await expect(page).toHaveURL(new RegExp(`/playlist/edit/${escapeForUrl(idText)}$`));
  await expect(heading).toBeVisible();
  await capturePageLoad(page, testInfo, 'The playlist edit form is open.', heading);
  return heading;
}

test.describe('Playlist tags', () => {
  test('When the title is empty, Submit stays disabled, and adding a tag does not enable it until the title is filled.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const typed = `Tag ${stamp}`;

    await test.step('Open the create form with an empty title.', async () => {
      await openCreateForm(page, testInfo);
      await expect(submitButton(page)).toBeDisabled();
    });

    await test.step('Adding a tag leaves Submit disabled.', async () => {
      await addTagWithEnter(page, typed);
      await expect(page).toHaveURL(/\/playlist\/create$/);
      await expect(submitButton(page)).toBeDisabled();
      await capturePageLoad(
        page,
        testInfo,
        'A tag is on the form and Submit stays disabled.',
        submitButton(page)
      );
    });

    await test.step('Filling the title enables Submit.', async () => {
      await fillTitle(page, `Enabled ${stamp}`);
      await expect(submitButton(page)).toBeEnabled();
      await capturePageLoad(
        page,
        testInfo,
        'Submit is enabled after the title is filled.',
        submitButton(page)
      );
    });
  });

  test('When a signed-in member types a new tag and presses Enter, the chip keeps that casing, and edit shows the folded name after save.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const title = `Casing ${stamp}`;
    const typed = `E2E ${stamp}`;
    const folded = foldedTag(typed);
    expect(folded).not.toBe(typed);
    expect(typed).toMatch(/[A-Z]/);

    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Type a tag and press Enter on the create form.', async () => {
      await openCreateForm(page, testInfo);
      await fillTitle(page, title);
      await addTagWithEnter(page, typed);
      await expect(page).toHaveURL(/\/playlist\/create$/);
      await capturePageLoad(
        page,
        testInfo,
        'The chip keeps the typed casing on the create form.',
        removeTagButton(page, typed)
      );
    });

    const idText = await test.step('Submit the playlist.', async () => {
      return submitAndReadPlaylistId(page, testInfo, title);
    });

    await test.step('Open edit and confirm the saved tag is folded.', async () => {
      await openEditForm(page, testInfo, idText);
      await expect(removeTagButton(page, folded)).toBeVisible();
      await expect(removeTagButton(page, typed)).toHaveCount(0);
      await capturePageLoad(
        page,
        testInfo,
        'The edit form shows the folded tag name.',
        removeTagButton(page, folded)
      );
    });
  });

  test('When a signed-in member saves a Public playlist with a tag, a later create can choose that stored name from search.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const firstTitle = `Visible ${stamp}`;
    const secondTitle = `Picked ${stamp}`;
    const typed = `${stamp} Visible`;
    const stored = foldedTag(typed);
    const prefix = `${stamp} vis`;

    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    await test.step('Save a Public playlist with a new tag.', async () => {
      await openCreateForm(page, testInfo);
      const publicItem = page.getByRole('menuitem', { name: 'Public', exact: true });
      await page.getByRole('button', { name: 'Sharable Status Private', exact: true }).click();
      await expect(publicItem).toBeVisible();
      await publicItem.click();
      await expect(
        page.getByRole('button', { name: 'Sharable Status Public', exact: true })
      ).toBeVisible();
      await fillTitle(page, firstTitle);
      await addTagWithEnter(page, typed);
      await submitAndReadPlaylistId(page, testInfo, firstTitle);
    });

    await test.step('Choose the stored name from search on a new create form.', async () => {
      await openCreateForm(page, testInfo);
      const combobox = tagsCombobox(page);
      await combobox.fill(prefix);
      const option = page.getByRole('option', { name: stored, exact: true });
      await expect(option).toBeVisible();
      await option.click();
      await expect(page).toHaveURL(/\/playlist\/create$/);
      await expect(removeTagButton(page, stored)).toBeVisible();
      await expect(removeTagButton(page, prefix)).toHaveCount(0);
      await expect(combobox).toHaveValue('');
      await capturePageLoad(
        page,
        testInfo,
        'The chip is the stored tag name from search.',
        removeTagButton(page, stored)
      );
    });

    await test.step('Save and confirm edit shows that stored name.', async () => {
      await fillTitle(page, secondTitle);
      const idText = await submitAndReadPlaylistId(page, testInfo, secondTitle);
      await openEditForm(page, testInfo, idText);
      await expect(removeTagButton(page, stored)).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'The edit form shows the stored tag name.',
        removeTagButton(page, stored)
      );
    });
  });

  test('When a signed-in member creates a playlist with no tags, edit shows the tag field and no remove control.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const title = `Empty ${stamp}`;

    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    const idText = await test.step('Create a playlist with a title and no tags.', async () => {
      await openCreateForm(page, testInfo);
      await fillTitle(page, title);
      await expect(tagsCombobox(page)).toBeVisible();
      await expect(page.locator('main').getByRole('button', { name: /^Remove / })).toHaveCount(0);
      return submitAndReadPlaylistId(page, testInfo, title);
    });

    await test.step('Open edit and confirm there is no saved tag.', async () => {
      await openEditForm(page, testInfo, idText);
      await expect(tagsCombobox(page)).toBeVisible();
      await expect(page.locator('main').getByRole('button', { name: /^Remove / })).toHaveCount(0);
      await capturePageLoad(
        page,
        testInfo,
        'The edit form has the tag field and no remove control.',
        tagsCombobox(page)
      );
    });
  });

  test('When a signed-in member replaces a saved tag and submits, a later visit to edit shows only the new tag.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const title = `Replace ${stamp}`;
    const firstTyped = `First ${stamp}`;
    const secondTyped = `Second ${stamp}`;
    const firstFolded = foldedTag(firstTyped);
    const secondFolded = foldedTag(secondTyped);

    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    const idText = await test.step('Create a playlist with one tag.', async () => {
      await openCreateForm(page, testInfo);
      await fillTitle(page, title);
      await addTagWithEnter(page, firstTyped);
      return submitAndReadPlaylistId(page, testInfo, title);
    });

    await test.step('Replace the saved tag and submit.', async () => {
      await openEditForm(page, testInfo, idText);
      await removeTagButton(page, firstFolded).click();
      await expect(removeTagButton(page, firstFolded)).toHaveCount(0);
      await addTagWithEnter(page, secondTyped);
      await submitAndReadPlaylistId(page, testInfo, title);
    });

    await test.step('Open edit again and confirm only the new tag remains.', async () => {
      await openEditForm(page, testInfo, idText);
      await expect(removeTagButton(page, secondFolded)).toBeVisible();
      await expect(removeTagButton(page, firstFolded)).toHaveCount(0);
      await expect(removeTagButton(page, secondTyped)).toHaveCount(0);
      await capturePageLoad(
        page,
        testInfo,
        'The edit form shows only the replacement tag.',
        removeTagButton(page, secondFolded)
      );
    });
  });

  test('When a signed-in member removes every tag and submits, a later visit to edit shows the tag field and no remove control.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const title = `Cleared ${stamp}`;
    const typed = `Keep ${stamp}`;
    const folded = foldedTag(typed);

    await test.step('Log in as the seeded E2E user.', async () => {
      await loginSeedUser(page);
    });

    const idText = await test.step('Create a playlist with one tag.', async () => {
      await openCreateForm(page, testInfo);
      await fillTitle(page, title);
      await addTagWithEnter(page, typed);
      return submitAndReadPlaylistId(page, testInfo, title);
    });

    await test.step('Remove the tag and submit an empty list.', async () => {
      await openEditForm(page, testInfo, idText);
      await removeTagButton(page, folded).click();
      await expect(removeTagButton(page, folded)).toHaveCount(0);
      await expect(tagsCombobox(page)).toBeVisible();
      await submitAndReadPlaylistId(page, testInfo, title);
    });

    await test.step('Open edit again and confirm no tags remain.', async () => {
      await openEditForm(page, testInfo, idText);
      await expect(tagsCombobox(page)).toBeVisible();
      await expect(page.locator('main').getByRole('button', { name: /^Remove / })).toHaveCount(0);
      await capturePageLoad(
        page,
        testInfo,
        'The edit form has the tag field and no remove control.',
        tagsCombobox(page)
      );
    });
  });

  test('When the form already has 5 tags, the tag field hides, the limit sentence shows, and removing one tag brings the field back.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const names = ['One', 'Two', 'Three', 'Four', 'Five'].map((word) => `${word} ${stamp}`);
    const limitSentence = page.getByText(TAG_LIMIT_SENTENCE, { exact: true });

    await test.step('Open the create form.', async () => {
      await openCreateForm(page, testInfo);
    });

    await test.step('Enter five tags.', async () => {
      for (const name of names) {
        await addTagWithEnter(page, name);
      }
      await expect(page).toHaveURL(/\/playlist\/create$/);
      await expect(tagsCombobox(page)).toHaveCount(0);
      await expect(limitSentence).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'The tag field is hidden and the limit sentence is visible.',
        limitSentence
      );
    });

    await test.step('Remove one tag and confirm the field returns.', async () => {
      const firstName = names[0];
      if (firstName === undefined) {
        throw new Error('The limit check needs a tag to remove.');
      }
      await removeTagButton(page, firstName).click();
      await expect(tagsCombobox(page)).toBeVisible();
      await expect(limitSentence).toBeHidden();
      const secondName = names[1];
      if (secondName !== undefined) {
        await expect(removeTagButton(page, secondName)).toBeVisible();
      }
      await capturePageLoad(
        page,
        testInfo,
        'Removing one tag shows the tag field again.',
        tagsCombobox(page)
      );
    });
  });

  test('When tag search fails, the field shows the generic error, and Enter still adds the typed name.', async ({
    page,
  }, testInfo) => {
    const stamp = tagStamp();
    const typed = `Broken ${stamp}`;
    const searchError = page.getByText(TAG_SEARCH_ERROR, { exact: true });

    await page.route('**/playlist/tag?*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'error' }),
      });
    });

    await test.step('Open the create form.', async () => {
      await openCreateForm(page, testInfo);
    });

    await test.step('Type a tag, wait for the search error, and press Enter.', async () => {
      const combobox = tagsCombobox(page);
      await combobox.fill(typed);
      await expect(searchError).toBeVisible();
      await combobox.press('Enter');
      await expect(page).toHaveURL(/\/playlist\/create$/);
      await expect(removeTagButton(page, typed)).toBeVisible();
      await capturePageLoad(
        page,
        testInfo,
        'Enter adds the typed tag after search fails.',
        removeTagButton(page, typed)
      );
    });
  });
});
