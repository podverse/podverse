import type { Locator, Page, TestInfo } from '@playwright/test';
import path from 'path';

const stepCounters = new WeakMap<TestInfo, number>();
const MAX_IMAGE_ATTACH_NAME_LENGTH = 60;

const isStepScreenshotsEnabled = (): boolean => {
  const raw = process.env.E2E_STEP_SCREENSHOTS?.trim().toLowerCase();
  if (raw === undefined || raw === '') {
    return false;
  }
  return raw === 'true' || raw === '1' || raw === 'yes';
};

const nextStepIndex = (testInfo: TestInfo): number => {
  const current = stepCounters.get(testInfo) ?? 0;
  const next = current + 1;
  stepCounters.set(testInfo, next);
  return next;
};

const truncate = (s: string, maxLen: number): string => {
  const t = s.trim();
  if (t.length <= maxLen) {
    return t;
  }
  return t.slice(0, maxLen);
};

/** Step description for the text attachment: [file#line] – label. Test context is shown once at test level in the report. */
const buildFullDescription = (testInfo: TestInfo, label: string): string => {
  const fileName = path.basename(testInfo.file);
  const sourceMarker = `[${fileName}#${testInfo.line}]`;
  const labelPart = label.trim();
  return [sourceMarker, labelPart]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' – ');
};

const captureStep = async (
  page: Page,
  testInfo: TestInfo,
  label: string,
  scrollToElement?: Locator
): Promise<void> => {
  if (!isStepScreenshotsEnabled()) {
    return;
  }
  if (scrollToElement !== undefined) {
    await scrollToElement.evaluate((el) =>
      el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
    );
  }
  const stepIndex = nextStepIndex(testInfo);
  const shortFileName = `step-${String(stepIndex).padStart(3, '0')}.png`;
  const screenshotPath = testInfo.outputPath(shortFileName);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const fullLabel = buildFullDescription(testInfo, label);
  const shortCaption = truncate(label, MAX_IMAGE_ATTACH_NAME_LENGTH);
  const imageAttachName = shortCaption ? `Step ${stepIndex}: ${shortCaption}` : `Step ${stepIndex}`;

  await testInfo.attach(imageAttachName, {
    path: screenshotPath,
    contentType: 'image/png',
  });
  await testInfo.attach('Step description', {
    body: fullLabel,
    contentType: 'text/plain',
  });
  const url = page.url();
  await testInfo.attach('Step URL', {
    body: url,
    contentType: 'text/plain',
  });
};

export const capturePageLoad = async (
  page: Page,
  testInfo: TestInfo,
  label = 'page-load',
  scrollToElement?: Locator
): Promise<void> => {
  await captureStep(page, testInfo, label, scrollToElement);
};

export const actionAndCapture = async (
  page: Page,
  testInfo: TestInfo,
  label: string,
  action: () => Promise<void>,
  scrollToElement?: Locator
): Promise<void> => {
  await action();
  await captureStep(page, testInfo, label, scrollToElement);
};
