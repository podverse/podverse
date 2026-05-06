'use client';

import classNames from 'classnames';
import NextImage from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

import { resolveImageCandidates } from '@podverse/helpers';

import { getConfig } from '../../config';
import { IMAGES } from '../../constants/images';
import { PROXY } from '../../constants/proxy';

import styles from '../../styles/components/Image/Image.module.scss';

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

  const isFluidGridSlot = width === IMAGES.LIST.GRID.SIZE && height === IMAGES.LIST.GRID.SIZE;
  const placeholderWidth = Math.round((width * 2) / 2.5);
  const placeholderHeight = Math.round((height * 2) / 2.5);

  const rawSrc = resolvedChain[attemptIndex];
  const showPlaceholder =
    resolvedChain.length === 0 || attemptIndex >= resolvedChain.length || rawSrc === undefined;

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
          src={IMAGES.SRC.PLACEHOLDER}
          alt={alt}
          width={placeholderWidth}
          height={placeholderHeight}
          className={classNames(
            styles.imagePlaceholder,
            isFluidGridSlot && styles.imagePlaceholderFluid
          )}
          priority={priority}
        />
      </div>
    );
  }

  const imageProxyEnabled = getConfig().public.imageProxy.enabled;
  const useProxy = imageProxyEnabled && !skipProxy;
  const finalSrc = useProxy ? PROXY.PATH + encodeURIComponent(rawSrc) : rawSrc;

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
    />
  );
};
