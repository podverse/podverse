'use client';

import classNames from 'classnames';
import React, { useEffect, useState } from 'react';

import { LoadingSpinner } from '../../layout/LoadingSpinner/index';
import { useImageRuntime } from '../ImageRuntime/ImageRuntime';

import styles from './ImageNonReact.module.scss';

type LoadPhase = 'loading' | 'loaded' | 'exhausted';

const candidatesId = (c: string[]) => JSON.stringify(c);

interface ImageNonReactProps {
  /** Tried in order: first that loads is shown; on error, the next is used until the list is exhausted. */
  candidates: string[];
  alt: string;
  className?: string;
  skipProxy?: boolean;
}

export const ImageNonReact: React.FC<ImageNonReactProps> = ({
  candidates,
  alt,
  className,
  skipProxy,
}) => {
  const { imageProxyEnabled, placeholderSrc, proxyPathPrefix } = useImageRuntime();

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<LoadPhase>(() =>
    candidates.length > 0 ? 'loading' : 'exhausted'
  );
  const id = candidatesId(candidates);

  useEffect(() => {
    if (id === '[]') {
      setIndex(0);
      setPhase('exhausted');
      return;
    }
    setIndex(0);
    setPhase('loading');
    // `id` is JSON.stringify(candidates) — do not list `candidates` in deps, or a new array ref
    // each parent render would reset the load every frame.
  }, [id]);

  const onLoadSuccess = () => {
    // #region agent log
    fetch('http://127.0.0.1:7492/ingest/b00b7ad8-3302-43b6-ba18-0bcb911f8469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '904d64' },
      body: JSON.stringify({
        sessionId: '904d64',
        runId: 'post-fix',
        hypothesisId: 'H3',
        location: 'ImageNonReact.tsx:onLoadSuccess',
        message: 'image load success',
        data: { index, candidate: candidates[index], alt, skipProxy },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setPhase('loaded');
  };

  const onImageError = () => {
    // #region agent log
    fetch('http://127.0.0.1:7492/ingest/b00b7ad8-3302-43b6-ba18-0bcb911f8469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '904d64' },
      body: JSON.stringify({
        sessionId: '904d64',
        runId: 'post-fix',
        hypothesisId: 'H1-H2-H6',
        location: 'ImageNonReact.tsx:onImageError',
        message: 'image load error',
        data: {
          index,
          candidate: candidates[index],
          nextIndex: index < candidates.length - 1 ? index + 1 : null,
          candidateCount: candidates.length,
          alt,
          skipProxy,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      setPhase('loading');
    } else {
      setPhase('exhausted');
    }
  };

  if (candidates.length === 0) {
    return (
      <div className={classNames(styles.wrapper, className)}>
        <img src={placeholderSrc} alt={alt} className={styles.fallback} />
      </div>
    );
  }

  const atEnd = phase === 'exhausted';
  const showHeadphone = atEnd;
  const currentUrl = candidates[index];
  const useProxy = imageProxyEnabled && !skipProxy;
  const showAttempt =
    !showHeadphone && currentUrl
      ? useProxy
        ? proxyPathPrefix + encodeURIComponent(currentUrl)
        : currentUrl
      : null;
  const showSpinner = !showHeadphone && phase === 'loading' && Boolean(showAttempt);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7492/ingest/b00b7ad8-3302-43b6-ba18-0bcb911f8469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '904d64' },
      body: JSON.stringify({
        sessionId: '904d64',
        runId: 'post-fix',
        hypothesisId: 'H2-H3-H5',
        location: 'ImageNonReact.tsx:renderState',
        message: 'image render state',
        data: {
          phase,
          index,
          showAttempt,
          showSpinner,
          showHeadphone,
          imageProxyEnabled,
          skipProxy,
          candidateCount: candidates.length,
          alt,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [alt, candidates.length, imageProxyEnabled, index, phase, showAttempt, showHeadphone, showSpinner, skipProxy]);

  return (
    <div
      className={classNames(styles.wrapper, className)}
      aria-busy={phase === 'loading' || undefined}
    >
      {showHeadphone && <img src={placeholderSrc} alt={alt} className={styles.fallback} />}

      {showAttempt && (
        <img
          key={`${id}-${index}-${showAttempt}`}
          src={showAttempt}
          alt={alt}
          onLoad={onLoadSuccess}
          onError={onImageError}
          className={classNames(styles.art, phase === 'loading' && styles.artHidden)}
        />
      )}

      {showSpinner && (
        <div className={styles.loadingOverlay} aria-hidden>
          <LoadingSpinner decorative size="medium" />
        </div>
      )}
    </div>
  );
};
