/**
 * CLI entry for generate_and_parse script.
 * Generates feed + assets, checks assets server is reachable, then populates DB via parser.
 * Run from monorepo root: npm run generate_and_parse -w podverse-test-assets
 * Requires: DB available (e.g. Lighthouse Docker), .env.api with DB_* set, assets server running (npm run start -w podverse-test-assets).
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_ASSETS_BASE_URL } from './constants.js';
import {
  confirmAddFakeValueTags,
  getFeedUrlsForSets,
  getPositionalCount,
  getValueFromConfig,
  parseNumericArg,
} from './generate-feed-cli.js';
import { generateFeedAndAssets } from './generate-feed.js';
import { checkAssetsServerReachable } from './check-assets-server.js';
import { populateDatabaseFromFeed } from './populate-database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const main = async () => {
  const monorepoRoot = path.resolve(__dirname, '..', '..', '..');
  const envCandidates = [
    path.join(monorepoRoot, '.env.api'),
    path.join(monorepoRoot, 'tools', 'web-perf', 'lighthouse', '.env.api'),
  ];
  const envPath = envCandidates.find((p) => fs.existsSync(p));
  if (envPath) {
    dotenv.config({ path: envPath });
    console.log('Generate and parse: loading .env.api from', envPath);
    // When running CLI standalone (no monorepo root .env.api), default to dev DB (5432).
    // Lighthouse calls populateDatabaseFromFeed in-process with its own env (5111); it never runs this CLI.
    const isLighthouseEnv = envPath === envCandidates[1];
    const useTestDb =
      process.env.TEST_ASSETS_USE_TEST_DB === '1' || process.env.TEST_ASSETS_USE_TEST_DB === 'true';
    if (isLighthouseEnv && !useTestDb) {
      process.env.DB_PORT = '5432';
      process.env.DB_HOST = '127.0.0.1';
      console.log(
        'Generate and parse: using dev database (DB_HOST=%s, DB_PORT=%s)',
        process.env.DB_HOST,
        process.env.DB_PORT
      );
    }
  } else {
    console.log(
      'Generate and parse: no .env.api found (tried:',
      envCandidates.join(', '),
      '). Set DB_* in the environment or create .env.api from tools/web-perf/lighthouse/.env.api.example'
    );
  }

  const argv = process.argv.slice(2);
  const count = getPositionalCount(argv) ?? 1;
  const itemsConfig = parseNumericArg('--items', 3, argv);
  const items = getValueFromConfig(itemsConfig);
  const forceRss = argv.includes('--force-rss');
  const addFakeValueTagsFlag = argv.includes('--add-fake-value-tags');

  let addFakeValueTags = false;
  if (addFakeValueTagsFlag) {
    const confirmed = await confirmAddFakeValueTags();
    if (!confirmed) {
      console.log('Skipping value tags. Exiting.');
      process.exit(1);
    }
    addFakeValueTags = true;
  }

  console.log('Generating feed and assets...');
  const gen = await generateFeedAndAssets({ count, items, forceRss, addFakeValueTags });
  if (!gen.success) {
    console.error('generate_and_parse: generate failed');
    process.exit(1);
  }
  console.log('Feed and assets ready.\n');

  console.log('Checking assets server is reachable...');
  try {
    await checkAssetsServerReachable({ timeoutMs: 5000 });
  } catch (err) {
    console.error('generate_and_parse:', err instanceof Error ? err.message : err);
    console.error('Start the assets server: npm run start -w podverse-test-assets');
    process.exit(1);
  }
  console.log('Assets server reachable.\n');

  const feedUrls = getFeedUrlsForSets(count, DEFAULT_ASSETS_BASE_URL);
  console.log('Populating database from', feedUrls.length, 'feeds...');
  try {
    for (let i = 0; i < feedUrls.length; i++) {
      const url = feedUrls[i];
      if (url) await populateDatabaseFromFeed(url, i + 1, { runChaptersParse: true });
    }
  } catch (err) {
    console.error('generate_and_parse: populateDatabaseFromFeed failed:', err);
    process.exit(1);
  }
  console.log('Database populated successfully.');
};

main();
