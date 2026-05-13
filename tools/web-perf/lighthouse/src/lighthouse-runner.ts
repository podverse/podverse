import fs from 'fs';
import type { Result as LighthouseResult } from 'lighthouse';
import lighthouse from 'lighthouse';
import path from 'path';

import type { BrowserAutomation } from './browser-automation.js';
import { TEST_FIXTURES } from './browser-automation.js';

export interface LighthouseScenarioResult {
  homepage?: LighthouseResult;
  podcastChannelPage?: LighthouseResult;
}

export interface LighthouseTestResults {
  loggedOut: LighthouseScenarioResult;
}

export interface LighthouseScreenshotOptions {
  saveScreenshots: boolean;
  screenshotsDir: string;
  sanitizedReportId: string;
}

export class LighthouseRunner {
  private readonly medianRuns = Math.max(1, Number(process.env.LIGHTHOUSE_MEDIAN_RUNS || 5));
  private readonly contextMode = (process.env.LIGHTHOUSE_CONTEXT_MODE || 'fresh').toLowerCase();

  constructor() {}

  async runLighthouseOnPage(url: string, port: number): Promise<LighthouseResult> {
    const result = await lighthouse(url, {
      port,
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance'],
      throttlingMethod: 'provided',
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1638.4,
        uploadThroughputKbps: 768,
        cpuSlowdownMultiplier: 4,
      },
      disableStorageReset: true,
      skipAudits: [],
    });

    if (!result?.lhr) {
      throw new Error(`Lighthouse failed to generate a report for ${url}`);
    }

    return result.lhr;
  }

  private async prepareContext(automation: BrowserAutomation, url: string) {
    const browser = automation.getBrowser();
    const context = await browser.newContext(automation.getContextOptions());
    await context.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    });
    const cookies = await automation.exportCookies();
    if (cookies.length > 0) {
      await context.addCookies(cookies);
    }
    const storage = await automation.exportStorage();
    await context.addInitScript((data) => {
      for (const item of data.localStorage) {
        window.localStorage.setItem(item.key, item.value);
      }
      for (const item of data.sessionStorage) {
        window.sessionStorage.setItem(item.key, item.value);
      }
    }, storage);

    const page = await context.newPage();
    await page.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      };
      await route.continue({ headers });
    });
    await page.goto(url, { waitUntil: 'networkidle' });

    return { context, page };
  }

  private async runWithFreshContext(
    automation: BrowserAutomation,
    url: string,
    port: number
  ): Promise<LighthouseResult> {
    const { context, page } = await this.prepareContext(automation, url);
    try {
      const currentUrl = page.url();
      return await this.runLighthouseOnPage(currentUrl, port);
    } finally {
      await context.close();
    }
  }

  private getAuditNumericValue(lhr: LighthouseResult, id: string): number | null {
    const value = lhr.audits?.[id]?.numericValue;
    return typeof value === 'number' ? value : null;
  }

  private getCategoryScore(lhr: LighthouseResult, id: string): number | null {
    const score = lhr.categories?.[id]?.score;
    return typeof score === 'number' ? score : null;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  private buildMedianLhr(runs: LighthouseResult[]): LighthouseResult {
    const base = runs[0];
    const clone = JSON.parse(JSON.stringify(base)) as LighthouseResult;

    const performanceScores = runs
      .map((lhr) => this.getCategoryScore(lhr, 'performance'))
      .filter((v): v is number => v !== null);
    if (performanceScores.length > 0 && clone.categories?.performance) {
      clone.categories.performance.score = this.median(performanceScores);
    }

    const auditIds = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'speed-index',
      'first-input-delay',
      'max-potential-fid',
      'cumulative-layout-shift',
      'interactive',
      'page-load-time',
      'total-byte-weight',
      'unused-javascript',
      'render-blocking-resources',
      'network-requests',
      'network-rtt',
    ];

    for (const auditId of auditIds) {
      const values = runs
        .map((lhr) => this.getAuditNumericValue(lhr, auditId))
        .filter((v): v is number => v !== null);
      if (values.length > 0 && clone.audits?.[auditId]) {
        clone.audits[auditId].numericValue = this.median(values);
      }
    }

    return clone;
  }

  private async runWithMedian(
    automation: BrowserAutomation,
    url: string,
    port: number
  ): Promise<LighthouseResult> {
    const runs: LighthouseResult[] = [];

    if (this.contextMode === 'single') {
      const { context, page } = await this.prepareContext(automation, url);
      try {
        const session = await context.newCDPSession(page);
        await session.send('Network.enable');
        for (let i = 0; i < this.medianRuns; i++) {
          await session.send('Network.clearBrowserCache');
          const currentUrl = page.url();
          runs.push(await this.runLighthouseOnPage(currentUrl, port));
        }
      } finally {
        await context.close();
      }
    } else {
      for (let i = 0; i < this.medianRuns; i++) {
        runs.push(await this.runWithFreshContext(automation, url, port));
      }
    }

    return this.buildMedianLhr(runs);
  }

  private async savePageScreenshot(
    automation: BrowserAutomation,
    screenshotPath: string
  ): Promise<void> {
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await automation.getPage().screenshot({ path: screenshotPath });
    console.log(`         📸 Screenshot saved: ${screenshotPath}`);
  }

  async testLoggedOut(
    automation: BrowserAutomation,
    screenshotOptions?: LighthouseScreenshotOptions
  ): Promise<LighthouseScenarioResult> {
    const results: LighthouseScenarioResult = {};
    console.log('   📋 Running logged-out tests...');

    try {
      // Reuse the Playwright Chromium instance via CDP for Lighthouse
      const port = automation.getCdpPort();
      console.log(`      ✅ Using Playwright Chrome on port ${port}`);

      // Homepage
      console.log('      → Testing homepage...');
      await automation.navigateToHomepage();
      await automation.waitBetweenActions();
      if (
        screenshotOptions?.saveScreenshots &&
        screenshotOptions.screenshotsDir &&
        screenshotOptions.sanitizedReportId
      ) {
        const homepagePath = path.join(
          screenshotOptions.screenshotsDir,
          `${screenshotOptions.sanitizedReportId}-homepage.png`
        );
        await this.savePageScreenshot(automation, homepagePath);
      }
      console.log('         Running Lighthouse audit...');
      results.homepage = await this.runWithMedian(
        automation,
        await automation.getCurrentUrl(),
        port
      );
      console.log('         ✅ Homepage test complete');

      // Podcast channel page
      await automation.navigateToChannel(TEST_FIXTURES.CHANNEL_1.id, false);
      await automation.waitBetweenActions();
      if (
        screenshotOptions?.saveScreenshots &&
        screenshotOptions.screenshotsDir &&
        screenshotOptions.sanitizedReportId
      ) {
        const channelPath = path.join(
          screenshotOptions.screenshotsDir,
          `${screenshotOptions.sanitizedReportId}-podcast-channel.png`
        );
        await this.savePageScreenshot(automation, channelPath);
      }
      results.podcastChannelPage = await this.runWithMedian(
        automation,
        await automation.getCurrentUrl(),
        port
      );

      // Potential scenarios to restore later: podcast episode, play, reload; logged-in flows.
    } finally {
      // Playwright owns the Chrome lifecycle
    }

    return results;
  }

  async runAllTests(
    automation: BrowserAutomation,
    screenshotOptions?: LighthouseScreenshotOptions
  ): Promise<LighthouseTestResults> {
    // Test logged out
    console.log('   🔓 Starting logged-out test suite...');
    await automation.clearCookies();
    const loggedOut = await this.testLoggedOut(automation, screenshotOptions);

    return {
      loggedOut,
    };
  }
}
