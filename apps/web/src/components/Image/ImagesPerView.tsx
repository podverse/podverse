'use client';

import Link from 'next/link';
import React from 'react';

import { Image } from './Image';

type ImagesPerViewProps = {
  src: string | undefined | null;
  alt: string;
  widthDesktop: number;
  heightDesktop: number;
  widthMobile: number;
  heightMobile: number;
  classNameDesktop?: string;
  classNameMobile?: string;
  href?: string;
};

export const ImagesPerView: React.FC<ImagesPerViewProps> = ({
  src,
  alt,
  widthDesktop,
  heightDesktop,
  widthMobile,
  heightMobile,
  classNameDesktop,
  classNameMobile,
  href,
}) => {
  const images = (
    <>
      <Image
        src={src}
        alt={alt}
        width={widthDesktop}
        height={heightDesktop}
        className={classNameDesktop}
      />
      <Image
        src={src}
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

  return images;
};
