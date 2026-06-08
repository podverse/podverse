import type { TableOfContentsSection } from '@podverse/ui';

import type { EmbedDemoShowcaseEntry } from './embedDemoLinks';

export function buildEmbedDemoAnchorId(showcaseId: string): string {
  return `embed-demo-${showcaseId}`;
}

export function buildEmbedDemoTocSections(params: {
  singleShowcase: EmbedDemoShowcaseEntry[];
  listShowcase: EmbedDemoShowcaseEntry[];
  singleSectionLabel: string;
  listSectionLabel: string;
}): TableOfContentsSection[] {
  return [
    {
      id: 'embed-demo-single-heading',
      label: params.singleSectionLabel,
      items: params.singleShowcase.map((entry) => ({
        id: buildEmbedDemoAnchorId(entry.showcaseId),
        label: entry.label,
      })),
    },
    {
      id: 'embed-demo-list-heading',
      label: params.listSectionLabel,
      items: params.listShowcase.map((entry) => ({
        id: buildEmbedDemoAnchorId(entry.showcaseId),
        label: entry.label,
      })),
    },
  ];
}
