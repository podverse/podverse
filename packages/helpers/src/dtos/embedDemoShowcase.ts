import type {
  EmbedDemoShowcaseId,
  EmbedDemoShowcaseRouteKind,
} from '../lib/constants/embedDemoShowcase.js';

export type EmbedDemoShowcaseApiEntry = {
  showcaseId: EmbedDemoShowcaseId;
  routeKind: EmbedDemoShowcaseRouteKind;
  resourceIdText: string;
  href: string;
  note: string | null;
};

export type EmbedDemoShowcaseApiResponse = {
  data: EmbedDemoShowcaseApiEntry[];
};

export type EmbedDemoShowcaseAdminSlot = {
  showcaseId: EmbedDemoShowcaseId;
  routeKind: EmbedDemoShowcaseRouteKind;
  resourceIdText: string | null;
};

export type EmbedDemoShowcaseAdminResponse = {
  data: EmbedDemoShowcaseAdminSlot[];
};
