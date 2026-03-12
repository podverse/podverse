/**
 * Public Podcast Index data (no API keys).
 * Feeds data is read from a CSV file produced locally by
 * `make dev_pi_feeds_download_csv` (SQLite dump is never stored on servers).
 */

import fs from 'node:fs';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import csv from 'csv-parser';

export type FeedRow = { id: number; url: string };

const FEEDS_CSV_MISSING_MESSAGE = `
The Podcast Index feeds CSV file was not found.

To create it locally:
  1. From the monorepo root, run: make dev_pi_feeds_download_csv
  2. This downloads the public dump, exports to CSV, and removes the SQLite/tgz files.

For alpha or other non-local environments:
  Upload a CSV file generated locally to the same path on the target host.
  The expected path is: infra/data/dev/podcast-index-feeds/podcastindex_feeds.csv
  (relative to repo root when the workspace is mounted).
`.trim();

function isValidFeedUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  return url.startsWith('http://') || url.startsWith('https://');
}

function isLiveRow(dead: unknown): boolean {
  if (dead === undefined || dead === null) {
    return true;
  }
  const s = String(dead).trim();
  return s === '' || s === '0';
}

/**
 * Iterates over feeds in the Podcast Index feeds CSV for the given ID range.
 * Only yields rows where dead is 0 or empty. Skips rows with empty or non-http(s) URLs.
 * If the CSV file does not exist, throws an error with steps to create it.
 */
export async function* iterateFeedsFromDb(
  csvPath: string,
  startId: number,
  endId: number
): AsyncGenerator<FeedRow> {
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${FEEDS_CSV_MISSING_MESSAGE}\n\nMissing file: ${resolved}`);
  }

  const stream = createReadStream(resolved).pipe(csv());
  for await (const row of stream) {
    const idRaw = row['id'];
    const url = row['url'];
    const dead = row['dead'];
    if (idRaw === undefined || idRaw === '') {
      continue;
    }
    const id = parseInt(idRaw, 10);
    if (isNaN(id) || id < startId || id > endId) {
      continue;
    }
    if (!isLiveRow(dead)) {
      continue;
    }
    if (isValidFeedUrl(url)) {
      yield { id, url };
    }
  }
}
