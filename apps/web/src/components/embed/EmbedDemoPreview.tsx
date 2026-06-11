import { getTranslations } from 'next-intl/server';

import type { EmbedRouteKind } from '../../lib/embed/embedTypes';
import { EmbedDemoPreviewIframe } from './EmbedDemoPreviewIframe';

type EmbedDemoPreviewProps = {
  showcaseId: string;
  label: string;
  href: string;
  routeKind: EmbedRouteKind;
};

export async function EmbedDemoPreview({
  showcaseId,
  label,
  href,
  routeKind,
}: EmbedDemoPreviewProps) {
  const t = await getTranslations('features');

  return (
    <EmbedDemoPreviewIframe
      href={href}
      iframeTitle={t('embed_demo_iframe_title', { label })}
      label={label}
      routeKind={routeKind}
      showcaseId={showcaseId}
    />
  );
}
