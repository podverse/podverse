// Log immediately - before any imports
console.log('📝 Script starting - loading modules...\n');

import inquirer from 'inquirer';
import { BrowserAutomation } from './browser-automation.js';
import type { LighthouseScreenshotOptions } from './lighthouse-runner.js';
import { LighthouseRunner } from './lighthouse-runner.js';
import { ReportManager } from './report-manager.js';
import { ComparisonEngine } from './comparison.js';
import { generateComparisonSummary } from './openai-summary.js';
// Delay podverse-orm import to avoid ESM/CommonJS conflicts
// import { UserManager } from './user-manager.js';
import { DatabaseSetup } from './database-setup.js';
import { WebAppManager } from './web-app-manager.js';
import { ApiManager } from './api-manager.js';
import { DEFAULT_HTTP_TIMEOUT_MS } from '@podverse/helpers';
import { killProcessOnPort } from './port-killer.js';
import {
  generateFeedAndAssets,
  checkAssetsServerReachable,
  populateDatabaseFromFeed,
  DEFAULT_TEST_FEED_URL,
} from 'podverse-test-assets';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📦 All modules loaded successfully\n');

const loadEnvFile = (label: string, relativePath: string, required: boolean) => {
  const envPath = path.join(__dirname, relativePath);
  if (fs.existsSync(envPath)) {
    console.log(`   → Loading ${label} from: ${envPath}`);
    dotenv.config({ path: envPath, override: true });
  } else if (required) {
    throw new Error(`Missing required ${label} file at: ${envPath}`);
  } else {
    console.log(`   ⚠️  No ${label} file found at: ${envPath}`);
  }
};

// Base URL will be set by WebAppManager (localhost:3111 for tests)
let BASE_URL = 'http://localhost:3111';

/**
 * Determines the next report number by examining existing reports.
 * Returns a 3-digit number with leading zeros (e.g., "001", "002").
 */
function getNextReportNumber(existingReports: string[]): string {
  if (existingReports.length === 0) {
    return '001';
  }

  // Extract numbers from existing report names
  const numbers = existingReports
    .map((name) => {
      const match = name.match(/^(\d+)-/);
      return match && match[1] ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => !isNaN(num));

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  return nextNumber.toString().padStart(3, '0');
}

// Store managers in module scope for cleanup handlers
let webAppManager: WebAppManager | null = null;
let apiManager: ApiManager | null = null;
let databaseSetup: DatabaseSetup | null = null;

// Setup signal handlers for cleanup (at module level)
const cleanup = async (signal?: string) => {
  console.log(
    `\n\n🛑 ${signal ? `Shutdown signal (${signal}) received` : 'Shutting down'}, cleaning up...`
  );

  if (webAppManager) {
    try {
      await webAppManager.stop();
    } catch (error) {
      console.error('   ⚠️  Error stopping web app:', error);
    }
  }

  if (apiManager) {
    try {
      await apiManager.stop();
    } catch (error) {
      console.error('   ⚠️  Error stopping API server:', error);
    }
  }

  if (databaseSetup) {
    try {
      await databaseSetup.teardownLighthouseServices();
    } catch (error) {
      console.error('   ⚠️  Error tearing down Lighthouse Docker services:', error);
    }
  }

  // Also try killing by port in case process references are lost
  try {
    await killProcessOnPort(3111); // Web app port
  } catch {
    // Ignore
  }
  try {
    await killProcessOnPort(1111); // API port
  } catch {
    // Ignore
  }
};

process.on('SIGINT', () => cleanup('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => cleanup('SIGTERM').then(() => process.exit(0)));

// Also handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught exception:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const errorStack = reason instanceof Error ? reason.stack : undefined;
  console.error('❌ Unhandled rejection:', errorMessage);
  if (errorStack) {
    console.error(errorStack);
  }
  await cleanup();
  process.exit(1);
});

async function main() {
  console.log('🚀 Lighthouse QA System for Podverse Web\n');

  // Clean up any existing processes on test ports at startup (web and API only; assets server is user-run)
  console.log('🔍 Checking for existing processes on test ports...');
  try {
    const webPortKilled = await killProcessOnPort(3111);
    const apiPortKilled = await killProcessOnPort(1111);
    if (webPortKilled || apiPortKilled) {
      console.log('✅ Cleaned up existing processes\n');
    } else {
      console.log('✅ Test ports are free\n');
    }
  } catch (error) {
    console.warn('⚠️  Could not check/kill processes on test ports:', error);
    console.log('   Continuing anyway...\n');
  }

  // Check required Docker containers first
  databaseSetup = new DatabaseSetup();

  // Ensure required test-assets exist: one podcast feed + media (BEFORE database setup)
  console.log('🎨 Generating podcast feed and assets (test-assets)...\n');
  const genResult = await generateFeedAndAssets({ count: 1, items: 3 });
  if (!genResult.success) {
    console.error('❌ generateFeedAndAssets failed');
    process.exit(1);
  }
  console.log('✅ Feed and assets ready (feed-podcast-1.rss + media)\n');

  // Check that the assets server is reachable (user must run it separately)
  try {
    await checkAssetsServerReachable({ timeoutMs: DEFAULT_HTTP_TIMEOUT_MS });
    console.log('✅ Assets server reachable\n');
  } catch (err) {
    console.error(
      '❌ The assets server is not running. Lighthouse tests need assets at http://localhost:2111/'
    );
    console.error('\nStart the server in a separate terminal, then run Lighthouse again:');
    console.error('  From repo root: npm run start -w podverse-test-assets');
    console.error('  Or: cd tools/test-assets && npm run start\n');
    process.exit(1);
  }

  // Setup test database BEFORE starting API (API needs database to start)
  console.log('🔧 Setting up test database...\n');
  try {
    console.log('   → Starting Lighthouse Docker services...');
    await databaseSetup.startLighthouseServices();
    console.log('   → Resetting and initializing database schema...');
    await databaseSetup.resetTestDatabase();
    console.log('✅ Test database ready\n');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    console.error('\nYou can try running manually from the monorepo root:');
    console.error('  docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml up -d');
    console.error(
      '  DB_HOST=127.0.0.1 DB_PORT=5111 DB_USER=postgres DB_PASSWORD=mysecretpw DB_NAME=postgres bash scripts/database/run-linear-migrations.sh --database app'
    );
    console.error(
      '  Then ensure DB_* env vars are set and run parser (see tools/test-assets docs).'
    );
    process.exit(1);
  }

  // Load API environment variables (required before populating DB via parser)
  console.log('🔧 Loading API environment variables...');
  loadEnvFile('.env.api', '../.env.api', true);
  console.log('✅ API environment variables loaded\n');

  // Populate database with channel/items from generated feed (test-assets parser)
  console.log('📥 Populating database from feed (parser in test-assets mode)...\n');
  try {
    await populateDatabaseFromFeed(DEFAULT_TEST_FEED_URL);
    console.log('✅ Database populated from feed\n');
  } catch (error) {
    console.error('❌ Failed to populate database from feed:', error);
    console.error('  Check DB connectivity and that .env.api has correct DB_* values.');
    process.exit(1);
  }

  // Start API first (web app depends on it)
  console.log('🌐 Starting API server for testing...\n');
  apiManager = new ApiManager();
  try {
    await apiManager.start();
  } catch (error) {
    console.error('❌ Failed to start API server:', error);
    process.exit(1);
  }

  // Load web environment variables
  console.log('🔧 Loading web environment variables...');
  loadEnvFile('.env.web', '../.env.web', true);
  console.log('✅ Web environment variables loaded\n');

  // Load Lighthouse-specific environment variables
  console.log('🔧 Loading Lighthouse environment variables...');
  loadEnvFile('.env.lighthouse', '../.env.lighthouse', true);
  console.log('✅ Lighthouse environment variables loaded\n');

  // Start web app (depends on API)
  console.log('🌐 Starting web app for testing...\n');
  webAppManager = new WebAppManager();
  try {
    BASE_URL = await webAppManager.start();
  } catch (error) {
    console.error('❌ Failed to start web app:', error);
    // Clean up API if web app fails to start
    if (apiManager?.isRunning()) {
      await apiManager.stop();
    }
    process.exit(1);
  }

  console.log('📍 Configuration:');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

  console.log('📂 Initializing components...');
  const reportManager = new ReportManager('web');
  const comparisonEngine = new ComparisonEngine();
  const saveScreenshots = process.env.LIGHTHOUSE_SAVE_SCREENSHOTS === 'true';
  if (saveScreenshots) {
    console.log('   📸 Screenshots enabled (saved alongside reports/web)');
  }
  console.log('   ✅ ReportManager and ComparisonEngine initialized\n');

  // Get existing reports
  console.log('📋 Checking for existing reports...');
  const existingReports = reportManager.getAllReports();
  console.log(`   Found ${existingReports.length} existing report(s)\n`);

  // Prompt for base report (required if any exist)
  console.log('💬 Prompting for report selection...');
  let baseReport: string | undefined;
  if (existingReports.length === 0) {
    console.log('   → No existing reports found; skipping comparison.\n');
  } else {
    const { selectedBaseReport } = await inquirer.prompt([
      {
        type: 'select',
        name: 'selectedBaseReport',
        message: 'Select the base report to compare against:',
        choices: existingReports.map((report) => ({ name: report, value: report })),
      },
    ]);
    baseReport = selectedBaseReport as string;
  }

  // Determine next report number
  const nextNumber = getNextReportNumber(existingReports);

  // Prompt for new test report identifier
  console.log('   → Asking for new report name...');
  console.log(`   → Next report will be prefixed with: ${nextNumber}-`);
  const { newReport } = await inquirer.prompt([
    {
      type: 'input',
      name: 'newReport',
      message: `Enter a description for report ${nextNumber} (number will be prefixed automatically):`,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Report description cannot be empty';
        }
        if (input.length > 50) {
          return 'Report description must be 50 characters or less';
        }
        return true;
      },
    },
  ]);

  const trimmedReportId = `${nextNumber}-${newReport.trim()}`;
  console.log(`   ✅ Report name: "${trimmedReportId}"\n`);

  // Check if new report already exists
  console.log(`🔍 Checking if report "${trimmedReportId}" already exists...`);
  if (reportManager.reportExists(trimmedReportId)) {
    console.log('   ⚠️  Report already exists');
    console.log('   → Asking for overwrite confirmation...');
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Report "${trimmedReportId}" already exists. Overwrite it?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log('❌ Cancelled. Exiting...');
      process.exit(0);
    }
    console.log('   ✅ Overwrite confirmed\n');
  } else {
    console.log('   ✅ Report name is new\n');
  }

  // Load base report if it exists
  console.log('📖 Loading base report (if specified)...');
  let baseReportData = null;
  if (baseReport) {
    console.log(`   → Loading report: "${baseReport}"`);
    baseReportData = reportManager.loadReport(baseReport);
    if (baseReportData) {
      console.log(`\n✅ Loaded base report: "${baseReport}"`);
    } else {
      console.log(`\n❌ Base report "${baseReport}" could not be loaded. Exiting...`);
      process.exit(1);
    }
  }

  console.log(`\n🧪 Running Lighthouse tests...`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Initialize automation and runner
  console.log('🌐 Initializing browser automation...');
  const automation = new BrowserAutomation(BASE_URL);
  const lighthouseRunner = new LighthouseRunner();

  try {
    console.log('   → Launching browser...');
    await automation.initialize();
    console.log('✅ Browser ready\n');

    console.log('🧪 Starting Lighthouse test suite...\n');
    const screenshotOptions: LighthouseScreenshotOptions | undefined = saveScreenshots
      ? {
          saveScreenshots: true,
          screenshotsDir: path.dirname(reportManager.getReportPath(trimmedReportId)),
          sanitizedReportId: reportManager.sanitizeReportId(trimmedReportId),
        }
      : undefined;
    const results = await lighthouseRunner.runAllTests(automation, screenshotOptions);

    console.log('\n✅ All tests completed!\n');

    // Save new report
    console.log(`💾 Saving report "${trimmedReportId}"...`);
    reportManager.saveReport(trimmedReportId, results, baseReport, saveScreenshots);
    console.log(
      `✅ Report saved to reports/report-${reportManager.sanitizeReportId(trimmedReportId)}.json\n`
    );

    // Compare if base report exists
    if (baseReport && baseReportData) {
      console.log('📊 Comparing reports...\n');
      const newReportData = reportManager.loadReport(trimmedReportId);
      if (newReportData) {
        const comparison = comparisonEngine.compareReports(baseReportData, newReportData);

        console.log('='.repeat(60));
        console.log('COMPARISON RESULTS');
        console.log('='.repeat(60));
        console.log(`Base Report: ${comparison.baseReport}`);
        console.log(`New Report: ${comparison.newReport}`);
        console.log(`\nSummary:`);
        console.log(`  ✅ Improvements: ${comparison.summary.improvements}`);
        console.log(`  ⚠️  Regressions: ${comparison.summary.regressions}`);
        console.log(`  ➡️  Neutral: ${comparison.summary.neutral}`);
        console.log('\n' + comparison.analysis);
        console.log('='.repeat(60));

        try {
          console.log('\n🧠 Generating OpenAI summary...');
          const summary = await generateComparisonSummary(
            baseReportData,
            newReportData,
            comparison
          );
          const summaryPath = path.join(
            path.dirname(reportManager.getReportPath(trimmedReportId)),
            `report-${reportManager.sanitizeReportId(trimmedReportId)}-summary.md`
          );
          fs.writeFileSync(summaryPath, summary || 'No summary generated.', 'utf-8');
          console.log(`✅ Summary saved to ${summaryPath}\n`);
        } catch (error) {
          console.error('⚠️  Failed to generate OpenAI summary:', error);
        }
      }
    } else {
      console.log('📊 No base report to compare against.');
      console.log('   Run the tool again with a different base report to compare results.');
    }
  } catch (error) {
    console.error('❌ Error running tests:', error);
    // Cleanup will happen in finally block
    throw error;
  } finally {
    console.log('🧹 Cleaning up...');

    // Stop browser automation
    try {
      await automation.cleanup();
      console.log('   ✅ Browser closed');
    } catch (error) {
      console.error('   ⚠️  Error closing browser:', error);
    }

    // Stop web app
    if (webAppManager) {
      try {
        await webAppManager.stop();
        console.log('   ✅ Web app stopped');
      } catch (error) {
        console.error('   ⚠️  Error stopping web app:', error);
      }
    }

    // Stop API server
    if (apiManager) {
      try {
        await apiManager.stop();
        console.log('   ✅ API server stopped');
      } catch (error) {
        console.error('   ⚠️  Error stopping API server:', error);
      }
    }

    if (databaseSetup) {
      try {
        await databaseSetup.teardownLighthouseServices();
        console.log('   ✅ Lighthouse Docker services stopped');
      } catch (error) {
        console.error('   ⚠️  Error tearing down Lighthouse Docker services:', error);
      }
    }
  }

  // Explicitly exit after successful completion
  console.log('\n✅ All processes completed. Exiting...\n');
  process.exit(0);
}

console.log('🚀 Starting main function...\n');

main().catch(async (error) => {
  console.error('❌ Fatal error:', error);
  await cleanup();
  process.exit(1);
});
