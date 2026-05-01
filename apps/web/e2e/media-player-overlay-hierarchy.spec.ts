import { test } from '@playwright/test';

import { expectInfoLinkTargetsItem, expectOverlayState } from './helpers/mediaPlayerAssertions';
import {
  openMediaPlayerHarness,
  seekToSeconds,
  selectScenario,
} from './helpers/mediaPlayerHarness';

test.describe('Media player overlay hierarchy', () => {
  test.setTimeout(30_000);

  test('applies vts > toc:false > chapter > none and tie-break precedence for full and mini', async ({
    page,
  }) => {
    await openMediaPlayerHarness(page);

    await test.step('VTS has highest precedence', async () => {
      await selectScenario(page, 'mp-scenario-vts');
      await seekToSeconds(page, 12);
      await expectOverlayState(page, 'vts', 'VTS Remote Match');
      await expectInfoLinkTargetsItem(page, '/episode/mp-scenario-vts-remote');
    });

    await test.step('toc:false chapter beats overlapping chapter', async () => {
      await selectScenario(page, 'mp-scenario-chapter-toc-false');
      await seekToSeconds(page, 10);
      await expectOverlayState(page, 'tocFalse', 'Inner toc:false chapter');
    });

    await test.step('normal chapter is used when no toc:false overlap exists', async () => {
      await selectScenario(page, 'mp-scenario-chapter-normal');
      await seekToSeconds(page, 10);
      await expectOverlayState(page, 'chapter', 'Standard chapter');
    });

    await test.step('none fallback uses base item metadata', async () => {
      await selectScenario(page, 'mp-scenario-none');
      await seekToSeconds(page, 10);
      await expectOverlayState(page, 'none', 'No chapter episode');
    });

    await test.step('tie-break prefers first list position when same-tier chapters overlap', async () => {
      await selectScenario(page, 'mp-scenario-tie-break');
      await seekToSeconds(page, 15);
      await expectOverlayState(page, 'chapter', 'First overlapping chapter');
    });
  });
});
