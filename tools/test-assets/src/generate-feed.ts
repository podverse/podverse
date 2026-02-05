import { runGenerateFeedAndAssets } from './generate-feed-cli.js';

export type GenerateFeedAndAssetsOptions = {
  /** Number of feed sets to generate. Default 1. */
  count?: number;
  /** Number of items per feed. Default 3. */
  items?: number;
};

/**
 * Generates podcast feed(s) and media assets under tools/test-assets/assets/ (flat).
 * Uses the same logic as the generate CLI.
 */
export async function generateFeedAndAssets(options: GenerateFeedAndAssetsOptions = {}): Promise<{
  success: boolean;
  written: number;
  skipped: number;
}> {
  const { count = 1, items = 3 } = options;
  const result = await runGenerateFeedAndAssets(count, {
    itemsConfig: { kind: 'fixed', value: items },
    multiConfig: { kind: 'fixed', value: 2 },
  });
  return {
    success: result.success,
    written: result.written,
    skipped: result.skipped,
  };
}
