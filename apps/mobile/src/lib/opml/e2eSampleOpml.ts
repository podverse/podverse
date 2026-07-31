/**
 * Embedded sample OPML for Maestro E2E. Native document pickers are out of Maestro scope;
 * when `EXPO_PUBLIC_MOBILE_E2E=1`, Import uses this payload against the fixtures sync path.
 *
 * The sample has two feeds that exercise the two real import branches:
 *   - a directory feed whose URL contains the `e2e-directory` sentinel → resolves to a fixed
 *     Podcast Index id (`enqueued_indexed`). It only records a *pending* follow, so re-importing
 *     stays `enqueued_indexed` — safe to keep stable.
 *   - an unknown feed → `added_by_rss`, which immediately subscribes the account. iOS and Android
 *     E2E share ONE Mobile E2E API account, so a fixed unknown URL would be `already_subscribed`
 *     on whichever platform imports second. Make the unknown URL unique per import so it always
 *     exercises the `added_by_rss` branch regardless of prior runs. Any URL without the
 *     `e2e-directory` sentinel resolves to `added_by_rss` (see apps/api/src/lib/opml/e2eOpmlImportFixture.ts).
 */
export const buildE2eSampleOpml = (): string => {
  const uniqueUnknownFeedUrl = `https://example.com/e2e-unknown-${Date.now()}-${Math.floor(
    Math.random() * 1_000_000
  )}.xml`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Podverse E2E OPML Import</title>
  </head>
  <body>
    <outline type="rss" text="E2E Directory Feed" title="E2E Directory Feed" xmlUrl="https://example.com/e2e-directory.xml" />
    <outline type="rss" text="E2E Unknown Feed" title="E2E Unknown Feed" xmlUrl="${uniqueUnknownFeedUrl}" />
  </body>
</opml>
`;
};
