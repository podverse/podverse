'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveImageCandidates } from '@podverse/helpers';

import { SkeletonFlashImage } from '../SkeletonFlashImage/SkeletonFlashImage';

type ImagesPerViewProps = {
  src?: string | undefined | null;
  /** Ordered URLs for load fallback (e.g. shrunken then originals). When omitted, `src` is used alone. */
  candidates?: string[];
  alt: string;
  widthDesktop: number;
  heightDesktop: number;
  widthMobile: number;
  heightMobile: number;
  classNameDesktop?: string;
  classNameMobile?: string;
  href?: string;
  onClick?: () => void;
};

export const ImagesPerView: React.FC<ImagesPerViewProps> = ({
  src,
  candidates,
  alt,
  widthDesktop,
  heightDesktop,
  widthMobile,
  heightMobile,
  classNameDesktop,
  classNameMobile,
  href,
  onClick,
}) => {
  const chain = useMemo(() => resolveImageCandidates(candidates, src), [candidates, src]);
  const chainId = useMemo(() => JSON.stringify(chain), [chain]);

  const [attemptIndex, setAttemptIndex] = useState(0);
  const bumpGate = useRef(false);

  useEffect(() => {
    setAttemptIndex(0);
  }, [chainId]);

  const onAttemptFailed = useCallback(() => {
    if (bumpGate.current) {
      return;
    }
    bumpGate.current = true;
    setAttemptIndex((i) => i + 1);
    queueMicrotask(() => {
      bumpGate.current = false;
    });
  }, []);

  const fallbackControl = useMemo(
    () => ({
      chain,
      attemptIndex,
      onAttemptFailed,
    }),
    [chain, attemptIndex, onAttemptFailed]
  );

  const images = (
    <>
      <SkeletonFlashImage
        fallbackControl={fallbackControl}
        alt={alt}
        width={widthDesktop}
        height={heightDesktop}
        className={classNameDesktop}
      />
      <SkeletonFlashImage
        fallbackControl={fallbackControl}
        alt={alt}
        width={widthMobile}
        height={heightMobile}
        className={classNameMobile}
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} tabIndex={-1}>
        {images}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} tabIndex={-1} style={{ cursor: 'pointer' }}>
        {images}
      </button>
    );
  }

  return images;
};
