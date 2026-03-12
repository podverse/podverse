import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FEEDS_CSV_FILENAME = 'podcastindex_feeds.csv';

const RELATIVE_FEEDS_DB_DIR = path.join('infra', 'data', 'dev', 'podcast-index-feeds');

/**
 * Walks up from dir looking for the monorepo root (directory whose package.json has "workspaces").
 * Returns that path or null if not found.
 */
function findMonorepoRoot(dir: string): string | null {
  let current = path.resolve(dir);
  const root = path.parse(current).root;
  while (current !== root) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const content = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(content) as { workspaces?: string[] };
        if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
          return current;
        }
      } catch {
        // ignore parse errors
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

/**
 * Directory for the Podcast Index feeds CSV (and any leftover .db/.tgz). Always
 * infra/data/dev/podcast-index-feeds: relative to monorepo root when the running
 * module is inside the repo, else relative to cwd.
 */
export function getDefaultFeedsDbDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findMonorepoRoot(moduleDir);
  if (repoRoot !== null) {
    return path.join(repoRoot, RELATIVE_FEEDS_DB_DIR);
  }
  return path.join(process.cwd(), RELATIVE_FEEDS_DB_DIR);
}

/**
 * Default path to the Podcast Index feeds CSV file used by devPiBulkFeedsAddFromFile.
 */
export function getDefaultFeedsCsvPath(): string {
  return path.join(getDefaultFeedsDbDir(), FEEDS_CSV_FILENAME);
}
