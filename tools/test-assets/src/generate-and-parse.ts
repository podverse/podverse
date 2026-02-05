/**
 * CLI entry for generate_and_parse script.
 * Generates feed + assets, checks assets server is reachable, then populates DB via parser.
 * Run from monorepo root: npm run generate_and_parse -w podverse-test-assets
 * Requires: DB available (e.g. Lighthouse Docker), .env.api with DB_* set, assets server running (npm run start -w podverse-test-assets).
 */
import dotenv from 'dotenv';
import path from 'path';
import { generateFeedAndAssets } from './generate-feed.js';
import { checkAssetsServerReachable } from './check-assets-server.js';
import { populateDatabaseFromFeed } from './populate-database.js';
import { DEFAULT_TEST_FEED_URL } from './constants.js';

const main = async () => {
  const repoRoot = process.cwd();
  const envPath = path.join(repoRoot, '.env.api');
  dotenv.config({ path: envPath });
  console.log('Generate and parse: loading env from', envPath);

  console.log('Generating feed and assets...');
  const gen = await generateFeedAndAssets({ count: 1, items: 3 });
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

  console.log('Populating database from feed...');
  try {
    await populateDatabaseFromFeed(DEFAULT_TEST_FEED_URL);
  } catch (err) {
    console.error('generate_and_parse: populateDatabaseFromFeed failed:', err);
    process.exit(1);
  }
  console.log('Database populated successfully.');
};

main();
