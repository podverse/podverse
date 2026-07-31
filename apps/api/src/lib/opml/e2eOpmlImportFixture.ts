/**
 * Deterministic OPML import feed resolution used when E2E fixtures are enabled
 * (PODVERSE_E2E_FIXTURES=1). The real controller calls Podcast Index over the
 * network to resolve a feed URL to a podcast_index_id; under fixtures we must
 * never touch the network so mobile/web E2E stays hermetic and non-flaky.
 *
 * Feed URLs containing the directory sentinel resolve to a fixed podcast index
 * id (exercises the `enqueued_indexed` branch); everything else resolves to
 * null (exercises the `added_by_rss` branch). Keep the sentinels in sync with
 * the E2E OPML fixtures:
 *   - apps/web/e2e/fixtures/sample-opml-import.opml
 *   - apps/mobile/src/lib/opml/e2eSampleOpml.ts
 */

const E2E_OPML_DIRECTORY_SENTINEL = 'e2e-directory';
const E2E_OPML_FIXTURE_PODCAST_INDEX_ID = 920666;

export const resolveE2eOpmlImportFeed = async (
  feedUrl: string
): Promise<{ podcast_index_id?: number | null; feedId?: number | null } | null> => {
  if (feedUrl.includes(E2E_OPML_DIRECTORY_SENTINEL)) {
    return { podcast_index_id: E2E_OPML_FIXTURE_PODCAST_INDEX_ID };
  }
  return null;
};
