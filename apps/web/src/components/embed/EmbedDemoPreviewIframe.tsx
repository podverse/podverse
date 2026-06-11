'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { buildEmbedDemoAnchorId } from '../../lib/embed/buildEmbedDemoTocItems';
import { EMBED_IFRAME_ALLOW } from '../../lib/embed/buildEmbedIframeCode';
import { resolveEmbedDemoPreviewPresentationStyle } from '../../lib/embed/embedDemoShowcaseCatalog';
import type { EmbedRouteKind } from '../../lib/embed/embedTypes';
import { getEmbedLayoutType } from '../../lib/embed/getEmbedLayoutType';
import { getEmbedPreviewIframeHeightClassKey } from '../../lib/embed/getEmbedPreviewIframeHeightClassKey';

import styles from '../../styles/components/embed/EmbedDemoPreview.module.scss';

type EmbedDemoPreviewIframeProps = {
  showcaseId: string;
  label: string;
  href: string;
  iframeTitle: string;
  routeKind: EmbedRouteKind;
};

export function EmbedDemoPreviewIframe({
  showcaseId,
  label,
  href,
  iframeTitle,
  routeKind,
}: EmbedDemoPreviewIframeProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const presentationStyle = resolveEmbedDemoPreviewPresentationStyle(showcaseId);
  const iframeHeightClassKey = getEmbedPreviewIframeHeightClassKey(
    getEmbedLayoutType(routeKind),
    presentationStyle
  );

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (element === null) {
      return;
    }

    const rootMarginPx = 200;
    const rect = element.getBoundingClientRect();
    const isNearViewport =
      rect.top < window.innerHeight + rootMarginPx && rect.bottom > -rootMarginPx;

    if (isNearViewport) {
      setIframeSrc(href);
    }
  }, [href]);

  useEffect(() => {
    const element = frameRef.current;
    if (element === null || iframeSrc !== null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry !== undefined && entry.isIntersecting) {
          setIframeSrc(href);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [href, iframeSrc]);

  return (
    <article className={styles.preview} data-testid={`embed-demo-preview-${showcaseId}`}>
      <h3 className={styles.title} id={buildEmbedDemoAnchorId(showcaseId)}>
        {label}
      </h3>
      <div
        className={`${styles.frame} ${styles[iframeHeightClassKey]}`}
        data-testid={`embed-demo-frame-${showcaseId}`}
        ref={frameRef}
      >
        {iframeSrc !== null ? (
          <iframe
            allow={EMBED_IFRAME_ALLOW}
            className={styles.iframe}
            data-testid={`embed-demo-iframe-${showcaseId}`}
            loading="lazy"
            src={iframeSrc}
            title={iframeTitle}
          />
        ) : (
          <div
            aria-hidden="true"
            className={styles.placeholder}
            data-testid={`embed-demo-placeholder-${showcaseId}`}
          />
        )}
      </div>
    </article>
  );
}
