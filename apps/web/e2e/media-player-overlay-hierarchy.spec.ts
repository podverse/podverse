import { test } from '@playwright/test';

import { expectInfoLinkTargetsItem, expectOverlayState } from './helpers/mediaPlayerAssertions';
import {
  openMediaPlayerHarness,
  seekToSeconds,
  selectScenario,
} from './helpers/mediaPlayerHarness';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Media player overlay hierarchy', () => {
  test.setTimeout(30_000);

  test('applies vts > toc:false > chapter > none and tie-break precedence for full and mini', async ({
    page,
  }, testInfo) => {
    await openMediaPlayerHarness(page);

    await test.step('VTS has highest precedence', async () => {
      await selectScenario(page, 'mp-scenario-vts');
      await seekToSeconds(page, 12);
      await expectOverlayState(page, 'vts', 'VTS Remote Match');
      await expectInfoLinkTargetsItem(page, '/episode/mp-scenario-vts-remote');

      await capturePageLoad(
        page,
        testInfo,
        'The VTS overlay has highest precedence at 12 seconds.'
      );
    });

    await test.step('toc:false chapter beats overlapping chapter', async () => {
      await selectScenario(page, 'mp-scenario-chapter-toc-false');
      await seekToSeconds(page, 10);
      await expectOverlayState(page, 'tocFalse', 'Inner toc:false chapter');

      await capturePageLoad(
        page,
        testInfo,
        'The toc:false chapter overlay beats overlapping chapters at 10 seconds.'
      );
    });

    await test.step('normal chapter is used when no toc:false overlap exists', async () => {
      await selectScenario(page, 'mp-scenario-chapter-normal');
      await seekToSeconds(page, 10);
      await expectOverlayState(page, 'chapter', 'Standard chapter');

      await capturePageLoad(
        page,
        testInfo,
        'The standard chapter overlay is shown when no toc:false overlap exists.'
      );
    });

    await test.step('none fallback uses base item metadata', async () => {
      await selectScenario(page, 'mp-scenario-none');
      await seekToSeconds(page, 10);
      await expectOverlayState(page, 'none', 'No chapter episode');

      await capturePageLoad(
        page,
        testInfo,
        'The none overlay fallback uses base item metadata at 10 seconds.'
      );
    });

    await test.step('tie-break prefers first list position when same-tier chapters overlap', async () => {
      await selectScenario(page, 'mp-scenario-tie-break');
      await seekToSeconds(page, 15);
      await expectOverlayState(page, 'chapter', 'First overlapping chapter');

      await capturePageLoad(
        page,
        testInfo,
        'Tie-break prefers the first overlapping chapter at 15 seconds.'
      );
    });
  });
});
