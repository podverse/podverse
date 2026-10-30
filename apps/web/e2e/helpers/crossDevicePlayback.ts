import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';

import { WEB_E2E_PLAYBACK_PRESENCE_LEAVE_GRACE_MS } from '@podverse/helpers-config';

import { loginSeedUser } from './addByRSSCredentials';

export const CROSS_DEVICE_DESKTOP_VIEWPORT = { width: 1280, height: 900 };
export const CROSS_DEVICE_MOBILE_VIEWPORT = { width: 390, height: 844 };

export type SignedInDevice = { context: BrowserContext; page: Page };

const visiblePlayerLocator = (page: Page): Locator =>
  page.locator('aside#media-player:visible').first();

/** New browser context signed in as the seed user (its own login session). */
export async function openSignedInDevice(
  browser: Browser,
  options?: { blockAutoplay?: boolean; viewport?: { width: number; height: number } }
): Promise<SignedInDevice> {
  const context = await browser.newContext({
    viewport: options?.viewport ?? CROSS_DEVICE_DESKTOP_VIEWPORT,
  });

  if (options?.blockAutoplay) {
    await context.addInitScript(() => {
      Reflect.set(window, '__pvE2eBlockPlay', true);
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
        if (Reflect.get(window, '__pvE2eBlockPlay') === true) {
          return Promise.reject(
            new DOMException('Playback needs a user gesture.', 'NotAllowedError')
          );
        }
        return originalPlay.call(this);
      };
    });
  }

  const page = await context.newPage();
  await loginSeedUser(page);
  return { context, page };
}

/**
 * The web E2E API drops a closed browser from playback presence after a short grace. The next
 * page that signs in as the same account has to open after that, or it follows the closed
 * browser and a local Play never loads audio.
 */
const PLAYBACK_PRESENCE_LEAVE_WAIT_MS = WEB_E2E_PLAYBACK_PRESENCE_LEAVE_GRACE_MS + 1_000;

export async function waitForPlaybackPresenceLeave(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, PLAYBACK_PRESENCE_LEAVE_WAIT_MS));
}

/** Close the contexts, then wait until their sessions have left playback presence. */
export async function closeSignedInDevices(devices: readonly SignedInDevice[]): Promise<void> {
  await Promise.all(devices.map((device) => device.context.close()));
  await waitForPlaybackPresenceLeave();
}

/** Let `play()` succeed again in a context opened with `blockAutoplay`. */
export async function allowAutoplay(page: Page): Promise<void> {
  await page.evaluate(() => {
    Reflect.set(window, '__pvE2eBlockPlay', false);
  });
}

export function playerDevicesButton(page: Page): Locator {
  return visiblePlayerLocator(page)
    .getByTestId('media-player-devices-button')
    .locator('visible=true')
    .first();
}

export function playerDeviceCaption(page: Page): Locator {
  return visiblePlayerLocator(page)
    .getByTestId('media-player-device-caption')
    .locator('visible=true')
    .first();
}

export function playerRemoteProgress(page: Page): Locator {
  return visiblePlayerLocator(page)
    .getByTestId('media-player-remote-progress')
    .locator('visible=true')
    .first();
}

export function playerRemoteLiveLabel(page: Page): Locator {
  return visiblePlayerLocator(page)
    .getByTestId('media-player-remote-live-label')
    .locator('visible=true')
    .first();
}

export function playerSegmentStripTitle(page: Page): Locator {
  return visiblePlayerLocator(page)
    .locator('[data-testid^="media-player-segment-strip-title-"]')
    .locator('visible=true')
    .first();
}

export function playerButton(page: Page, name: string): Locator {
  return visiblePlayerLocator(page)
    .getByRole('button', { name, exact: true })
    .locator('visible=true')
    .first();
}

export async function audioState(
  page: Page
): Promise<{ paused: boolean; currentTime: number; playbackRate: number } | null> {
  const audio = page.locator('audio').first();
  if ((await audio.count()) === 0) {
    return null;
  }
  return audio.evaluate((element) => {
    if (!(element instanceof HTMLMediaElement)) {
      return null;
    }
    return {
      paused: element.paused,
      currentTime: element.currentTime,
      playbackRate: element.playbackRate,
    };
  });
}
