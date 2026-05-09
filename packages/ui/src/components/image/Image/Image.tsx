'use client';

import classNames from 'classnames';
import NextImage from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

import { resolveImageCandidates } from '@podverse/helpers';

import { useImageRuntime } from '../ImageRuntime/ImageRuntime';

import styles from './Image.module.scss';

export type ImageFallbackControl = {
  chain: string[];
  attemptIndex: number;
  onAttemptFailed: () => void;
};

export interface ImageProps {
  src?: string | null;
  /** When set, tried in order on load failure (shrunken first, then native fallbacks). Overrides single `src`. */
  candidates?: string[];
  /**
   * Paired desktop/mobile artwork: shared chain + index so both viewports stay aligned.
   * When set, `src` / `candidates` are ignored.
   */
  fallbackControl?: ImageFallbackControl;
  alt: string;
  width: number;
  height: number;
  className?: string;
  skipProxy?: boolean;
  priority?: boolean;
  /**
   * Brief skeleton tint behind the image box until load (see SkeletonFlashImage).
   * Off by default so transparent branding assets show true transparency.
   */
  enableSkeletonFlash?: boolean;
  onLoad?: () => void;
}

export const Image: React.FC<ImageProps> = ({
  src,
  candidates,
  fallbackControl,
  alt,
  width,
  height,
  className,
  skipProxy,
  priority,
  enableSkeletonFlash = false,
  onLoad,
}) => {
  const {
    imageProxyEnabled,
    listGridSlotSize,
    nextImageOptimizationEnabled,
    placeholderSrc,
    proxyPathPrefix,
  } = useImageRuntime();

  const nextImageUnoptimized = !nextImageOptimizationEnabled;

  const resolvedChain =
    fallbackControl !== undefined ? fallbackControl.chain : resolveImageCandidates(candidates, src);

  const chainId = useMemo(() => JSON.stringify(resolvedChain), [resolvedChain]);

  const [internalAttemptIndex, setInternalAttemptIndex] = useState(0);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInternalAttemptIndex(0);
  }, [chainId, skipProxy]);

  const attemptIndex =
    fallbackControl !== undefined ? fallbackControl.attemptIndex : internalAttemptIndex;

  useEffect(() => {
    setLoaded(false);
  }, [chainId, attemptIndex]);

  const onLoadFailure = () => {
    if (fallbackControl !== undefined) {
      fallbackControl.onAttemptFailed();
    } else {
      setInternalAttemptIndex((i) => i + 1);
    }
  };

  const handleLoad = () => {
    if (enableSkeletonFlash) {
      setLoaded(true);
    }
    onLoad?.();
  };

  const isFluidGridSlot = width === listGridSlotSize && height === listGridSlotSize;
  const placeholderWidth = Math.round((width * 2) / 2.5);
  const placeholderHeight = Math.round((height * 2) / 2.5);

  const rawSrc = resolvedChain[attemptIndex];
  const showPlaceholder =
    resolvedChain.length === 0 || attemptIndex >= resolvedChain.length || rawSrc === undefined;

  // #region agent log
  useEffect(() => {
    if (showPlaceholder || width !== 1920 || height !== 1920) {
      return;
    }
    const active = rawSrc ?? null;
    fetch('http://127.0.0.1:7492/ingest/b00b7ad8-3302-43b6-ba18-0bcb911f8469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd08547' },
      body: JSON.stringify({
        sessionId: 'd08547',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'Image.tsx:lightbox_attempt',
        message: 'image_lightbox_chain_attempt',
        data: {
          attemptIndex,
          chainLen: resolvedChain.length,
          usesProxy: imageProxyEnabled && !skipProxy,
          activeSuffix: active !== null && active.length > 0 ? active.slice(-56) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [
    attemptIndex,
    chainId,
    height,
    imageProxyEnabled,
    rawSrc,
    resolvedChain.length,
    showPlaceholder,
    skipProxy,
    width,
  ]);
  // #endregion

  if (showPlaceholder) {
    return (
      <div
        className={classNames(
          styles.placeholderOuter,
          isFluidGridSlot && styles.placeholderOuterFluid,
          className
        )}
        style={isFluidGridSlot ? undefined : { width, height }}
      >
        <NextImage
          src={placeholderSrc}
          alt={alt}
          width={placeholderWidth}
          height={placeholderHeight}
          className={classNames(
            styles.imagePlaceholder,
            isFluidGridSlot && styles.imagePlaceholderFluid
          )}
          priority={priority}
          unoptimized={nextImageUnoptimized}
        />
      </div>
    );
  }

  const useProxy = imageProxyEnabled && !skipProxy;
  const finalSrc = useProxy ? proxyPathPrefix + encodeURIComponent(rawSrc) : rawSrc;

  const skeletonClass = enableSkeletonFlash && !loaded ? styles.skeletonBg : undefined;

  return (
    <NextImage
      key={`${chainId}-${attemptIndex}`}
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={classNames(skeletonClass, className)}
      onError={onLoadFailure}
      onLoad={handleLoad}
      priority={priority}
      unoptimized={nextImageUnoptimized}
    />
  );
};
