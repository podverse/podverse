import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { ROUTES } from './helpers/routes';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const SEARCH_PLACEHOLDER = 'Title, feed URL, GUID, or provider feed ID';

async function signIn(page: Page): Promise<void> {
  await page.goto(ROUTES.HOME);
  await page.locator('#email').fill('e2e-superadmin@example.com');
  await page.locator('#password').fill('Test!1Aa');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

async function openStub(page: Page, title: string): Promise<void> {
  await page.goto(ROUTES.FEEDS_REMOTE_STUBS);
  await expect(page).toHaveURL(/\/feeds\/remote-stubs$/);
  await expect(page.getByRole('heading', { name: 'Remote Stubs', level: 1 })).toBeVisible();
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await row.getByRole('link', { name: 'View' }).click();
  await expect(page).toHaveURL(/\/feeds\/remote-stubs\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

test.describe('Management-web remote stubs', () => {
  test('When an admin opens Feeds, the Remote Stubs card opens the list.', async ({
    page,
  }, testInfo: TestInfo) => {
    await signIn(page);
    await page.goto(ROUTES.FEEDS);
    await expect(page).toHaveURL(/\/feeds$/);
    await expect(page.getByRole('heading', { name: 'Feeds', level: 1 })).toBeVisible();

    const card = page.getByRole('link', { name: /Remote Stubs/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText('without parsing them');
    await actionAndCapture(
      page,
      testInfo,
      'The Remote Stubs card opens the list.',
      async () => {
        await card.click();
        await expect(page).toHaveURL(/\/feeds\/remote-stubs$/);
        await expect(page.getByRole('heading', { name: 'Remote Stubs', level: 1 })).toBeVisible();
      },
      page.getByRole('heading', { name: 'Remote Stubs', level: 1 })
    );
  });

  test('When an admin searches the remote stub list, only the matching seeded stub stays.', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await page.goto(ROUTES.FEEDS_REMOTE_STUBS);
    await expect(page).toHaveURL(/\/feeds\/remote-stubs$/);
    await expect(page.getByRole('heading', { name: 'Remote Stubs', level: 1 })).toBeVisible();
    await expect(page.getByRole('row', { name: /E2E Remote Stub Recheck/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /E2E Remote Stub Promote/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /E2E Remote Stub Delete/ })).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'The list shows the three seeded remote stubs.',
      page.getByRole('row', { name: /E2E Remote Stub Recheck/ })
    );

    const search = page.getByRole('searchbox', { name: SEARCH_PLACEHOLDER });
    await search.fill('Recheck');
    await expect(page.getByRole('row', { name: /E2E Remote Stub Recheck/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /E2E Remote Stub Promote/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /E2E Remote Stub Delete/ })).toHaveCount(0);

    await search.fill('876543251');
    const promoteRow = page.getByRole('row', { name: /E2E Remote Stub Promote/ });
    await expect(promoteRow).toBeVisible();
    await expect(page.getByRole('row', { name: /E2E Remote Stub Recheck/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /E2E Remote Stub Delete/ })).toHaveCount(0);
    await capturePageLoad(
      page,
      testInfo,
      'Searching the provider feed id leaves the promote stub.',
      promoteRow
    );
  });

  test('When an admin chooses Re-check Now, the stub shows a queued job and disabled queue buttons.', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await openStub(page, 'E2E Remote Stub Recheck');
    await expect(page.getByRole('cell', { name: 'e2e-remote-stub-1', exact: true })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'https://example.com/e2e-remote-stub-1.xml' })
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'E2E Remote Stub Item One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'E2E Remote Stub Item Two' })).toBeVisible();
    await capturePageLoad(
      page,
      testInfo,
      'The recheck stub shows two aliases and two items.',
      page.getByRole('cell', { name: 'E2E Remote Stub Item Two' })
    );

    const notice = page.getByText('Re-check queued. Workers run it within a few minutes.');
    await actionAndCapture(
      page,
      testInfo,
      'Re-check Now queues the job and disables the queue buttons.',
      async () => {
        await page.getByRole('button', { name: 'Re-check Now', exact: true }).click();
        await expect(notice).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Pending', exact: true })).toBeVisible();
        await expect(page.getByText('Re-check Queued', { exact: true })).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Re-check Now', exact: true })
        ).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Re-point', exact: true })).toBeDisabled();
        await expect(
          page.getByRole('button', { name: 'Promote to Full Parse', exact: true })
        ).toBeDisabled();
      },
      notice
    );
  });

  // Re-point runs before promote: a queued promote disables the three queue buttons.
  test('When an admin re-points a stub with 0123, the modal shows the validation message.', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await openStub(page, 'E2E Remote Stub Promote');
    await page.getByRole('button', { name: 'Re-point', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Re-point' });
    await expect(
      dialog.getByText('Use when the provider merged this feed into another feed id.')
    ).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Provider Feed ID' }).fill('0123');
    const validation = dialog.getByText(/fails to match the required pattern/);
    await actionAndCapture(
      page,
      testInfo,
      'Re-point with 0123 shows the provider feed id validation message.',
      async () => {
        await dialog.getByRole('button', { name: 'Re-point', exact: true }).click();
        await expect(validation).toBeVisible();
      },
      validation
    );
  });

  test('When an admin confirms Promote to Full Parse, the page shows the queued notice.', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await openStub(page, 'E2E Remote Stub Promote');
    await page.getByRole('button', { name: 'Promote to Full Parse', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Promote to Full Parse' });
    await expect(dialog.getByText(/Adds this feed to/)).toBeVisible();
    const notice = page.getByText('Promote queued. Workers run it within a few minutes.');
    await actionAndCapture(
      page,
      testInfo,
      'Promote to Full Parse queues the job.',
      async () => {
        await dialog.getByRole('button', { name: 'Confirm' }).click();
        await expect(dialog).toBeHidden();
        await expect(notice).toBeVisible();
      },
      notice
    );
  });

  test('When an admin confirms Delete, the stub leaves the list.', async ({ page }, testInfo) => {
    await signIn(page);
    await openStub(page, 'E2E Remote Stub Delete');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete Remote Stub' });
    await expect(
      dialog.getByText(/Deletes the stub, its aliases, and its item rows/)
    ).toBeVisible();
    const listHeading = page.getByRole('heading', { name: 'Remote Stubs', level: 1 });
    await actionAndCapture(
      page,
      testInfo,
      'Delete returns to the list and the stub row is gone.',
      async () => {
        await dialog.getByRole('button', { name: 'Confirm' }).click();
        await expect(page).toHaveURL(/\/feeds\/remote-stubs$/);
        await expect(listHeading).toBeVisible();
        await expect(page.getByRole('row', { name: /E2E Remote Stub Delete/ })).toHaveCount(0);
      },
      listHeading
    );
  });
});
