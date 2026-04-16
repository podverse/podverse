/**
 * Hardcoded RSS/MB1 fields for the Donate boost flow (dev/test).
 * Must stay in sync with apps/web/public/feeds/podverse-boosts-feed.xml.
 * Temporary until env-driven config is needed.
 */
export type Mb1RssContext = {
  feedGuid: string;
  itemGuid: string;
  feedTitle: string;
  itemTitle: string;
};

export const DONATE_MB1_RSS_CONTEXT: Mb1RssContext = {
  feedGuid: 'urn:uuid:8f251367-7d2e-4e5a-a8ba-1f1f8d9a6f11',
  itemGuid: 'https://podverse.fm/donate',
  feedTitle: 'Podverse Boosts Feed',
  itemTitle: 'Podverse Donation Page',
};
