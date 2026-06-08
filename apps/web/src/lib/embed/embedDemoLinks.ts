import {
  buildEmbedFixtureDemoHref,
  EMBED_FIXTURE_DEMO_SPECS,
  shouldUseEmbedDemoFixtures,
} from './embedFixtureIds';
import type { EmbedMediaType, EmbedRouteKind } from './embedTypes';

export type EmbedDemoShowcaseSpec = {
  showcaseId: string;
  label: string;
  routeKind: EmbedRouteKind;
};

export type EmbedDemoShowcaseEntry = EmbedDemoShowcaseSpec & {
  href: string | null;
  note: string | null;
};

/** Primary embed demo slots on `/embed`. */
export const EMBED_DEMO_SHOWCASE_SPECS: EmbedDemoShowcaseSpec[] = EMBED_FIXTURE_DEMO_SPECS.map(
  ({ showcaseId, label, routeKind }) => ({
    showcaseId,
    label,
    routeKind,
  })
);

export function resolveEmbedDemoShowcaseFromFixtures(): EmbedDemoShowcaseEntry[] {
  return EMBED_FIXTURE_DEMO_SPECS.map((spec) => ({
    showcaseId: spec.showcaseId,
    label: spec.label,
    routeKind: spec.routeKind,
    href: buildEmbedFixtureDemoHref(spec.routeKind, spec.resourceIdText),
    note: spec.note,
  }));
}

export { shouldUseEmbedDemoFixtures };

export function resolveEmbedDemoPreviewPresentationStyle(showcaseId: string): EmbedMediaType {
  if (showcaseId.endsWith('-video')) {
    return 'video';
  }

  return 'audio';
}
