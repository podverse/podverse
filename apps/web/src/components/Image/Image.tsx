'use client';

import classNames from 'classnames';
import NextImage from 'next/image';
import React, { useState } from 'react';

import { IMAGES } from '../../constants/images';
import { PROXY } from '../../constants/proxy';

import styles from '../../styles/components/Image/Image.module.scss';

interface ImageProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  skipProxy?: boolean;
  priority?: boolean;
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  skipProxy,
  priority,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    const isFluidGridSlot = width === IMAGES.LIST.GRID.SIZE && height === IMAGES.LIST.GRID.SIZE;
    const placeholderWidth = Math.round((width * 2) / 2.5);
    const placeholderHeight = Math.round((height * 2) / 2.5);
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

  const finalSrc = skipProxy ? src : PROXY.PATH + encodeURIComponent(src);

  return (
    <NextImage
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setImageError(true)}
      priority={priority}
    />
  );
};
