import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearSeededPodcastQueueResources } from './helpers/mediaPlayerAssertions';
import {
  E2E_PODCAST_CHANNEL_TITLE,
  E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE,
  E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT,
  E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE,
  E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_TITLE,
  E2E_PODCAST_ITEM_MARQUEE_CHAPTER_WEB_URL,
  E2E_PODCAST_ITEM_MARQUEE_TITLE,
  E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const DESKTOP_VIEWPORT = { width: 1200, height: 900 };
const NARROW_VIEWPORT = { width: 420, height: 900 };
const SHORT_EPISODE_TITLE = 'E2E Podcast Resume P > 0';

type PlayerVariant = 'desktop' | 'mobile';
type SettledMarqueeLayout = 'fit' | 'scroll';

type ModalArtworkMetrics = {
  imageHeight: number;
  imageWidth: number;
  subtitleHeight: number;
  titleHeight: number;
};

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function fullscreenModalLocator(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Fullscreen Media Player' });
}

async function openFullscreenMediaPlayerModal(page: Page): Promise<Locator> {
  await page.locator('#media-player').getByRole('button').first().click();
  const modal = fullscreenModalLocator(page);
  await expect(modal).toBeVisible();
  return modal;
}

async function closeFullscreenMediaPlayerModal(page: Page): Promise<void> {
  await fullscreenModalLocator(page).getByRole('button', { name: 'Close Modal' }).click();
  await expect(fullscreenModalLocator(page)).toHaveCount(0);
}

async function playFromMain(page: Page): Promise<void> {
  await page.locator('main').getByRole('button', { name: 'Play' }).first().click();
}

async function openEpisode(page: Page, idText: string, heading: string): Promise<void> {
  await page.goto(`/episode/${idText}`);
  await expect(page).toHaveURL(new RegExp(`/episode/${idText}`));
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
}

async function openEmbed(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const pathname = path.split('?')[0] ?? path;
  await expect(page).toHaveURL(new RegExp(pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  if (path.includes('player=responsive')) {
    await expect(page).toHaveURL(/player=responsive/);
  }
  if (path.includes('player=compact')) {
    await expect(page).toHaveURL(/player=compact/);
  }
  if (path.includes('t=2')) {
    await expect(page).toHaveURL(/[?&]t=2(?:&|$)/);
  }
  await expect(page.getByTestId('embed-player-info')).toBeVisible();
}

function barTitle(page: Page, variant: PlayerVariant): Locator {
  return page.getByTestId(`media-player-bar-title-${variant}`);
}

function stripRoot(page: Page, variant: PlayerVariant): Locator {
  return page.getByTestId(`media-player-segment-strip-${variant}`);
}

function stripTitle(page: Page, variant: PlayerVariant): Locator {
  return page.getByTestId(`media-player-segment-strip-title-${variant}`);
}

function stripLabel(page: Page, variant: PlayerVariant): Locator {
  return page.getByTestId(`media-player-segment-strip-label-${variant}`);
}

function chapterStripLabel(title: string): string {
  return `Chapter: ${title}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectShownMarquee(
  locator: Locator,
  layout: SettledMarqueeLayout,
  text: string
): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toHaveAttribute('data-marquee-layout', layout);
  await expect(locator).toContainText(text);
}

async function expectHiddenMeasuring(locator: Locator): Promise<void> {
  await expect(locator).toBeHidden();
  await expect(locator).toHaveAttribute('data-marquee-layout', 'measuring');
}

async function expectSegmentStripsAbsent(page: Page): Promise<void> {
  await expect(stripRoot(page, 'desktop')).toHaveCount(0);
  await expect(stripRoot(page, 'mobile')).toHaveCount(0);
}

/**
 * The bar button's accessible name is the artwork alt, one copy of the title, and the channel
 * line. The second scrolling copy and the measurer are omitted from that name.
 */
async function expectVisibleBarButtonTitle(
  page: Page,
  title: string,
  absentTitle?: string
): Promise<void> {
  const button = page
    .locator('#media-player')
    .getByRole('button', { name: title })
    .filter({ visible: true });
  await expect(button).toBeVisible();
  const titlePattern = escapeRegExp(title);
  await expect(button).toHaveAccessibleName(new RegExp(titlePattern));
  await expect(button).not.toHaveAccessibleName(
    new RegExp(`${titlePattern}[\\s\\S]*${titlePattern}`)
  );
  if (absentTitle !== undefined) {
    await expect(button).not.toHaveAccessibleName(new RegExp(escapeRegExp(absentTitle)));
  }
}

async function readModalArtworkMetrics(modal: Locator): Promise<ModalArtworkMetrics> {
  const metrics = await modal
    .locator('[class*="mediaPlayerModalContent"]')
    .first()
    .evaluate((root) => {
      const title = root.querySelector('[class*="titleSection"]');
      const subtitle = root.querySelector('[class*="subtitleSection"]');
      const imageInner = root.querySelector('[class*="imageInner"]');
      if (title === null || subtitle === null || imageInner === null) {
        return null;
      }
      const titleRect = title.getBoundingClientRect();
      const subtitleRect = subtitle.getBoundingClientRect();
      const imageRect = imageInner.getBoundingClientRect();
      return {
        imageHeight: imageRect.height,
        imageWidth: imageRect.width,
        subtitleHeight: subtitleRect.height,
        titleHeight: titleRect.height,
      };
    });
  expect(metrics).not.toBeNull();
  if (metrics === null) {
    throw new Error('Expected title, subtitle, and artwork boxes in the full-size player.');
  }
  return metrics;
}

function expectArtworkMatches(actual: ModalArtworkMetrics, baseline: ModalArtworkMetrics): void {
  expect(Math.abs(actual.titleHeight - baseline.titleHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(actual.subtitleHeight - baseline.subtitleHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(actual.imageWidth - baseline.imageWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(actual.imageHeight - baseline.imageHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(actual.imageWidth - actual.imageHeight)).toBeLessThanOrEqual(2);
  expect(actual.imageHeight).toBeGreaterThan(350);
}

async function dragVisibleProgressBar(
  page: Page,
  fromRatio: number,
  toRatio: number
): Promise<void> {
  const slider = page
    .locator('aside#media-player [role="slider"][aria-valuetext*=" of "]:visible')
    .first();
  await expect(slider).toBeVisible();
  const box = await slider.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    throw new Error('Expected the visible progress slider to have a bounding box.');
  }
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * fromRatio, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * toRatio, y, { steps: 8 });
}

test.describe('Media player marquee', () => {
  test.beforeEach(async ({ page }) => {
    await loginSeedUser(page);
    await clearSeededPodcastQueueResources(page);
  });

  test('When an episode title is wider than the player, the desktop bar and the full-size player scroll that line, the segment strip stays off, and the artwork stays the size it is for a short title.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await openEpisode(page, E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT, SHORT_EPISODE_TITLE);
    await playFromMain(page);
    await expectShownMarquee(barTitle(page, 'desktop'), 'fit', SHORT_EPISODE_TITLE);
    await expectHiddenMeasuring(barTitle(page, 'mobile'));
    await expectSegmentStripsAbsent(page);

    const shortModal = await openFullscreenMediaPlayerModal(page);
    await expectShownMarquee(
      page.getByTestId('media-player-modal-title'),
      'fit',
      SHORT_EPISODE_TITLE
    );
    await expectShownMarquee(
      page.getByTestId('media-player-modal-channel-title'),
      'fit',
      E2E_PODCAST_CHANNEL_TITLE
    );
    await expect(page.getByTestId('media-player-modal-subsection-title')).toHaveCount(0);
    const shortArtwork = await readModalArtworkMetrics(shortModal);
    await closeFullscreenMediaPlayerModal(page);

    await openEpisode(page, E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT, E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await playFromMain(page);
    const desktopTitle = barTitle(page, 'desktop');
    await expectShownMarquee(desktopTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await expectVisibleBarButtonTitle(page, E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await expectHiddenMeasuring(barTitle(page, 'mobile'));
    await expectSegmentStripsAbsent(page);
    await capturePageLoad(
      page,
      testInfo,
      'The desktop player bar scrolls a title wider than its line.',
      desktopTitle
    );

    const modalTitle = page.getByTestId('media-player-modal-title');
    await actionAndCapture(
      page,
      testInfo,
      'The full-size player scrolls a long episode title without changing the artwork size.',
      async () => {
        const modal = await openFullscreenMediaPlayerModal(page);
        await expectShownMarquee(modalTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_TITLE);
        await expect(
          modal.getByRole('link', { name: E2E_PODCAST_ITEM_MARQUEE_TITLE, exact: true })
        ).toBeVisible();
        await expectShownMarquee(
          page.getByTestId('media-player-modal-channel-title'),
          'fit',
          E2E_PODCAST_CHANNEL_TITLE
        );
        await expect(page.getByTestId('media-player-modal-subsection-title')).toHaveCount(0);
        expectArtworkMatches(await readModalArtworkMetrics(modal), shortArtwork);
      },
      modalTitle
    );
  });

  test('When the window is narrow, the mobile player bar scrolls a long episode title, the desktop bar stays hidden, and the segment strip stays off.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await openEpisode(page, E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT, E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await playFromMain(page);
    const mobileTitle = barTitle(page, 'mobile');
    await expectShownMarquee(mobileTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await expectVisibleBarButtonTitle(page, E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await expectHiddenMeasuring(barTitle(page, 'desktop'));
    await expectSegmentStripsAbsent(page);
    await capturePageLoad(
      page,
      testInfo,
      'The narrow player bar scrolls a title wider than its line.',
      mobileTitle
    );
  });

  test('When reduced motion is on, a long episode title stays still in the player bar and the full-size player, and a long chapter title stays still on the segment strip.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openEpisode(page, E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT, E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await playFromMain(page);
    await expectShownMarquee(barTitle(page, 'desktop'), 'fit', E2E_PODCAST_ITEM_MARQUEE_TITLE);
    await expectHiddenMeasuring(barTitle(page, 'mobile'));
    await expectSegmentStripsAbsent(page);

    const modalTitle = page.getByTestId('media-player-modal-title');
    await actionAndCapture(
      page,
      testInfo,
      'With reduced motion, the full-size player keeps a long title still.',
      async () => {
        await openFullscreenMediaPlayerModal(page);
        await expectShownMarquee(modalTitle, 'fit', E2E_PODCAST_ITEM_MARQUEE_TITLE);
      },
      modalTitle
    );
    await closeFullscreenMediaPlayerModal(page);

    await openEpisode(
      page,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    await playFromMain(page);
    await expectShownMarquee(
      barTitle(page, 'desktop'),
      'fit',
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    const desktopStripTitle = stripTitle(page, 'desktop');
    await expect(desktopStripTitle).toContainText(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expect(stripRoot(page, 'desktop')).toBeVisible();
    await expect(stripRoot(page, 'desktop')).toHaveAttribute('data-segment-kind', 'chapter');
    await expectShownMarquee(desktopStripTitle, 'fit', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expect(page.getByTestId('media-player-segment-strip-icon-desktop')).toHaveCount(0);
    await expect(stripLabel(page, 'desktop')).toHaveText(
      chapterStripLabel(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE)
    );
    await expect(stripRoot(page, 'mobile')).toBeHidden();
    await expectHiddenMeasuring(stripTitle(page, 'mobile'));
    await capturePageLoad(
      page,
      testInfo,
      'With reduced motion, the segment strip keeps a long chapter title still.',
      desktopStripTitle
    );
  });

  test('When a chapter title is wider than the player, the desktop segment strip scrolls it, the bar title stays the episode title, and dragging the progress bar into the next chapter changes the strip.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await openEpisode(
      page,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    await playFromMain(page);

    const desktopStripTitle = stripTitle(page, 'desktop');
    await expect(desktopStripTitle).toContainText(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expectShownMarquee(
      barTitle(page, 'desktop'),
      'fit',
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    await expectVisibleBarButtonTitle(
      page,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE
    );
    await expectHiddenMeasuring(barTitle(page, 'mobile'));
    await expect(stripRoot(page, 'desktop')).toBeVisible();
    await expect(stripRoot(page, 'desktop')).toHaveAttribute('data-segment-kind', 'chapter');
    await expectShownMarquee(desktopStripTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expect(page.getByTestId('media-player-segment-strip-icon-desktop')).toHaveCount(0);
    await expect(stripLabel(page, 'desktop')).toHaveText(
      chapterStripLabel(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE)
    );
    await expect(stripRoot(page, 'mobile')).toBeHidden();
    await expectHiddenMeasuring(stripTitle(page, 'mobile'));
    await capturePageLoad(
      page,
      testInfo,
      'The player bar keeps the episode title and scrolls the active chapter on the strip above it.',
      desktopStripTitle
    );

    const subsectionTitle = page.getByTestId('media-player-modal-subsection-title');
    await actionAndCapture(
      page,
      testInfo,
      'The full-size player scrolls a long chapter title beside its link.',
      async () => {
        const modal = await openFullscreenMediaPlayerModal(page);
        await expectShownMarquee(
          page.getByTestId('media-player-modal-title'),
          'fit',
          E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
        );
        await expectShownMarquee(
          page.getByTestId('media-player-modal-channel-title'),
          'fit',
          E2E_PODCAST_CHANNEL_TITLE
        );
        await expectShownMarquee(subsectionTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
        const chapterLink = modal.getByTestId('media-player-chapter-link');
        await expect(chapterLink).toBeVisible();
        await expect(chapterLink.locator('a')).toHaveAttribute(
          'href',
          E2E_PODCAST_ITEM_MARQUEE_CHAPTER_WEB_URL
        );
      },
      subsectionTitle
    );
    await closeFullscreenMediaPlayerModal(page);

    // The playhead seeks once when the pointer is released, not while dragging.
    await dragVisibleProgressBar(page, 0.1, 0.75);
    await page.mouse.up();
    await expect(desktopStripTitle).toContainText(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_TITLE);
    await expectShownMarquee(desktopStripTitle, 'fit', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_TITLE);
    await expect(stripLabel(page, 'desktop')).toHaveText(
      chapterStripLabel(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_TITLE)
    );
    await expect(stripRoot(page, 'desktop')).toHaveAttribute('data-segment-kind', 'chapter');
    await expect(barTitle(page, 'desktop')).toContainText(
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
  });

  test('When the window is narrow, the mobile segment strip scrolls a long chapter title and the bar title stays the episode title.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await openEpisode(
      page,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    await playFromMain(page);

    const mobileStripTitle = stripTitle(page, 'mobile');
    await expect(mobileStripTitle).toContainText(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    // 27 characters fit this bar. The chapter line above it is the one that scrolls.
    await expectShownMarquee(
      barTitle(page, 'mobile'),
      'fit',
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    await expectVisibleBarButtonTitle(
      page,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE,
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE
    );
    await expect(stripRoot(page, 'mobile')).toBeVisible();
    await expect(stripRoot(page, 'mobile')).toHaveAttribute('data-segment-kind', 'chapter');
    await expectShownMarquee(mobileStripTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expect(page.getByTestId('media-player-segment-strip-icon-mobile')).toHaveCount(0);
    await expect(stripLabel(page, 'mobile')).toHaveText(
      chapterStripLabel(E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE)
    );
    await expect(stripRoot(page, 'desktop')).toBeHidden();
    await expectHiddenMeasuring(stripTitle(page, 'desktop'));
    await expectHiddenMeasuring(barTitle(page, 'desktop'));
    await capturePageLoad(
      page,
      testInfo,
      'The narrow player bar scrolls the active chapter on the strip and keeps the episode title on the title line.',
      mobileStripTitle
    );
  });

  test('When the embed player is the responsive layout, a long episode title scrolls, the channel line fits, and a long chapter title scrolls on the segment line while the title line stays the episode title.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await openEmbed(
      page,
      `/embed/episode/${E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT}?player=responsive`
    );
    await expectShownMarquee(
      page.getByTestId('embed-title'),
      'scroll',
      E2E_PODCAST_ITEM_MARQUEE_TITLE
    );
    await expectShownMarquee(
      page.getByTestId('embed-channel-title'),
      'fit',
      E2E_PODCAST_CHANNEL_TITLE
    );
    await expect(page.getByTestId('embed-segment-info-title')).toHaveCount(0);
    await expect(page.getByTestId('embed-segment-info-bar')).toHaveCount(0);
    await expect(page.getByTestId('embed-title-toggle')).toHaveCount(0);

    await openEmbed(
      page,
      `/embed/episode/${E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT}?player=responsive&t=2`
    );
    await expectShownMarquee(
      page.getByTestId('embed-title'),
      'fit',
      E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE
    );
    await expect(page.getByTestId('embed-segment-info-bar')).toBeVisible();
    const segmentTitle = page.getByTestId('embed-segment-info-title');
    await expectShownMarquee(segmentTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expectShownMarquee(
      page.getByTestId('embed-channel-title'),
      'fit',
      E2E_PODCAST_CHANNEL_TITLE
    );
    await expect(page.getByTestId('embed-title-toggle')).toHaveCount(0);
    await capturePageLoad(
      page,
      testInfo,
      'The responsive embed player scrolls the active chapter on its segment line.',
      segmentTitle
    );
  });

  test('When the embed player is the compact layout, a long chapter title scrolls on the title line inside the toggle, the channel line fits, and there is no segment strip.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await openEmbed(
      page,
      `/embed/episode/${E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT}?player=compact&t=2`
    );
    await expect(page.getByTestId('embed-title-toggle')).toBeVisible();
    const toggleTitle = page.getByTestId('embed-title-toggle-title');
    await expectShownMarquee(toggleTitle, 'scroll', E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE);
    await expectShownMarquee(
      page.getByTestId('embed-channel-title'),
      'fit',
      E2E_PODCAST_CHANNEL_TITLE
    );
    await expect(page.getByTestId('embed-title')).toHaveCount(0);
    await expect(page.getByTestId('embed-segment-info-bar')).toHaveCount(0);
    await expect(page.getByTestId('embed-segment-info-title')).toHaveCount(0);
    await capturePageLoad(
      page,
      testInfo,
      'The compact embed player scrolls a long chapter title on its title line.',
      toggleTitle
    );
  });
});
