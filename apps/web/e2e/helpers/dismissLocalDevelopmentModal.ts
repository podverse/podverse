import type { Page } from '@playwright/test';

/**
 * Non-production stacks show the server-environment disclaimer ("Local Development ⚙️").
 * It blocks pointer events until the user agrees and clicks Continue — Escape alone is unreliable,
 * especially when another modal is open underneath.
 *
 * After client navigation, wait for the dialog to be visible (see call sites) before calling this,
 * or the dialog may not have mounted yet and this will return without doing anything.
 */
export async function dismissLocalDevelopmentModal(page: Page): Promise<void> {
  const devDialog = page.getByRole('dialog', { name: /Local Development/i });
  if (!(await devDialog.isVisible().catch(() => false))) {
    return;
  }

  // TextCheckboxes uses a native input; do not rely on the computed accessible name (i18n / label wiring).
  const checkbox = devDialog.locator('input[type="checkbox"]');
  if ((await checkbox.count()) > 0 && !(await checkbox.isChecked())) {
    await checkbox.first().click();
  }

  const continueButton = devDialog.getByRole('button', { name: /continue/i });
  await continueButton.click();

  await devDialog.waitFor({ state: 'hidden', timeout: 10_000 });
}
