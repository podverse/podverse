import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function openMediaPlayerHarness(page: Page) {
  await page.goto('/e2e/media-player-foundation');
  await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
}

export async function selectScenario(page: Page, scenarioId: string) {
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
