import type { Page } from '@playwright/test';

async function dismissBlockingDevModal(page: Page) {
  const devDialog = page.getByRole('dialog', { name: /Local Development/i });
  if ((await devDialog.count()) > 0 && (await devDialog.first().isVisible())) {
    await page.keyboard.press('Escape');
    await devDialog
      .first()
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});

    if (await devDialog.first().isVisible()) {
      const closeButton = devDialog.first().getByRole('button').first();
      if ((await closeButton.count()) > 0) {
        await closeButton.click({ force: true });
      }
    }
  }
}

export async function openMediaPlayerHarness(page: Page) {
  await page.goto('/e2e/media-player-foundation');
  await dismissBlockingDevModal(page);
}

export async function selectScenario(page: Page, scenarioId: string) {
  await dismissBlockingDevModal(page);
  await page.evaluate((nextScenarioId) => {
    window.dispatchEvent(
      new CustomEvent('media_player_set_scenario', { detail: { scenarioId: nextScenarioId } })
    );
  }, scenarioId);
}

export async function seekToSeconds(page: Page, seconds: number) {
  await page.evaluate((time) => {
    window.dispatchEvent(new CustomEvent('media_player_seek', { detail: { time } }));
  }, seconds);
}

export async function setLoggedInState(page: Page, loggedIn: boolean) {
  const statusText = await page.getByTestId('auth-status').textContent();
  const isLoggedIn = statusText === 'logged-in';
  if (isLoggedIn !== loggedIn) {
    await page.getByTestId('login-toggle').click();
  }
}

export async function clickVtsLike(page: Page) {
  await page.getByTestId('vts-like-heart').click();
}
