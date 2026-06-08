import { getTranslations } from 'next-intl/server';

import {
  EMBED_IFRAME_ALLOW,
  getEmbedIframeHeightForRouteKind,
} from '../../lib/embed/buildEmbedIframeCode';
import { resolveEmbedDemoPreviewPresentationStyle } from '../../lib/embed/embedDemoLinks';
import type { EmbedRouteKind } from '../../lib/embed/embedTypes';

import styles from '../../styles/components/embed/EmbedDemoPreview.module.scss';

type EmbedDemoPreviewProps = {
  showcaseId: string;
  label: string;
  href: string | null;
  routeKind: EmbedRouteKind;
};

export async function EmbedDemoPreview({
  showcaseId,
  label,
  href,
  routeKind,
}: EmbedDemoPreviewProps) {
  const t = await getTranslations('features');
  const height = getEmbedIframeHeightForRouteKind(
    routeKind,
    resolveEmbedDemoPreviewPresentationStyle(showcaseId)
  );
  const hasPreview = href !== null && href !== undefined && href !== '';

  return (
    <article className={styles.preview} data-testid={`embed-demo-preview-${showcaseId}`}>
      <h3>{label}</h3>
      {hasPreview ? (
        <div className={styles.frame} data-testid={`embed-demo-frame-${showcaseId}`}>
          <iframe
            allow={EMBED_IFRAME_ALLOW}
            className={styles.iframe}
            data-testid={`embed-demo-iframe-${showcaseId}`}
            height={height}
            loading="lazy"
            src={href}
            title={t('embed_demo_iframe_title', { label })}
          />
        </div>
      ) : (
        <div className={styles.frame} data-testid={`embed-demo-frame-${showcaseId}`}>
          <p
            className={styles.unavailable}
            data-testid={`embed-demo-unavailable-${showcaseId}`}
          >
            {t('embed_demo_no_suitable_content')}
          </p>
        </div>
      )}
    </article>
  );
}
