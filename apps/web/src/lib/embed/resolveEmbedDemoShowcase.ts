import { getTranslations } from 'next-intl/server';

import type { EmbedDemoShowcaseApiEntry } from '@podverse/helpers';

import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import {
  getEmbedDemoShowcaseLabelKey,
  getEmbedDemoShowcaseOrderIndex,
} from './embedDemoShowcaseCatalog';
import type { EmbedRouteKind } from './embedTypes';

function isEmbedRouteKind(value: string): value is EmbedRouteKind {
  return (
    value === 'episode' ||
    value === 'track' ||
    value === 'clip' ||
    value === 'chapter' ||
    value === 'official-clip' ||
    value === 'podcast' ||
    value === 'album' ||
    value === 'playlist' ||
    value === 'episode-chapters'
  );
}

// Route kinds that stay live but are hidden from the `/embed` demo listing.
const HIDDEN_DEMO_ROUTE_KINDS = new Set<EmbedRouteKind>(['official-clip', 'playlist']);

export type EmbedDemoShowcaseEntry = EmbedDemoShowcaseApiEntry & {
  label: string;
  labelKey: ReturnType<typeof getEmbedDemoShowcaseLabelKey>;
};

export async function resolveEmbedDemoShowcase(): Promise<EmbedDemoShowcaseEntry[]> {
  const { ssrApiRequestService: api } = await getSSRAuthService();
  const t = await getTranslations('features');

  let configured: EmbedDemoShowcaseApiEntry[];
  try {
    configured = (await api.reqEmbedDemoGetShowcase()).data;
  } catch {
    configured = [];
  }

  const entries = configured.flatMap((entry) => {
    if (!isEmbedRouteKind(entry.routeKind)) {
      return [];
    }

    if (HIDDEN_DEMO_ROUTE_KINDS.has(entry.routeKind)) {
      return [];
    }

    const labelKey = getEmbedDemoShowcaseLabelKey(entry.showcaseId);

    return [
      {
        ...entry,
        labelKey,
        label: t(labelKey),
        routeKind: entry.routeKind,
      },
    ];
  });

  return entries.sort(
    (a, b) =>
      getEmbedDemoShowcaseOrderIndex(a.showcaseId) - getEmbedDemoShowcaseOrderIndex(b.showcaseId)
  );
}
