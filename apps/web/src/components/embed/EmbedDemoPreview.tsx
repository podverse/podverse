import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getEmbedIframeHeightForRouteKind } from '../../lib/embed/buildEmbedIframeCode';
import type { EmbedRouteKind } from '../../lib/embed/embedTypes';

import styles from '../../styles/components/embed/EmbedDemoPreview.module.scss';

type EmbedDemoPreviewProps = {
  showcaseId: string;
  label: string;
  href: string | null;
  routeKind: EmbedRouteKind;
  note?: string | null;
};

export async function EmbedDemoPreview({
  showcaseId,
  label,
  href,
  routeKind,
  note,
}: EmbedDemoPreviewProps) {
  const t = await getTranslations('features');
  const height = getEmbedIframeHeightForRouteKind(routeKind);
  const hasPreview = href !== null && href !== undefined && href !== '';
  const showNote =
    note !== null &&
    note !== undefined &&
    note !== '' &&
    note.trim().toLowerCase() !== label.trim().toLowerCase();

  return (
    <article className={styles.preview} data-testid={`embed-demo-preview-${showcaseId}`}>
      <h3 className={styles.heading}>
        {hasPreview ? (
          <Link className={styles.link} href={href}>
            {label}
          </Link>
        ) : (
          <span className={styles.label}>{label}</span>
        )}
      </h3>
      {showNote ? <p className={styles.note}>{note}</p> : null}
      {hasPreview ? (
        <iframe
          allow="autoplay; encrypted-media"
          className={styles.iframe}
          data-testid={`embed-demo-iframe-${showcaseId}`}
          height={height}
          loading="lazy"
          src={href}
          title={t('embed_demo_iframe_title', { label })}
        />
      ) : (
        <p
          className={styles.unavailable}
          data-testid={`embed-demo-unavailable-${showcaseId}`}
        >
          {t('embed_demo_no_suitable_content')}
        </p>
      )}
    </article>
  );
}
