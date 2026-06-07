import type { EmbedRouteKind } from './embedTypes';

export type EmbedDemoShowcaseSpec = {
  showcaseId: string;
  label: string;
  routeKind: EmbedRouteKind;
};

export type EmbedDemoShowcaseEntry = EmbedDemoShowcaseSpec & {
  href: string | null;
  note: string | null;
};

/** Primary embed demo slots on `/embed`; hrefs are resolved at request time from list APIs. */
export const EMBED_DEMO_SHOWCASE_SPECS: EmbedDemoShowcaseSpec[] = [
  {
    showcaseId: 'episode',
    label: 'Episode',
    routeKind: 'episode',
  },
  {
    showcaseId: 'track',
    label: 'Track',
    routeKind: 'track',
  },
  {
    showcaseId: 'podcast',
    label: 'Podcast',
    routeKind: 'podcast',
  },
  {
    showcaseId: 'album',
    label: 'Album',
    routeKind: 'album',
  },
  {
    showcaseId: 'playlist',
    label: 'Playlist',
    routeKind: 'playlist',
  },
];
