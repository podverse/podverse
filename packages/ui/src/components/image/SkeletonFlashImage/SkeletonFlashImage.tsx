'use client';

import React from 'react';

import type { ImageProps } from '../Image/Image';
import { Image } from '../Image/Image';

export type SkeletonFlashImageProps = Omit<ImageProps, 'enableSkeletonFlash'>;

export const SkeletonFlashImage: React.FC<SkeletonFlashImageProps> = (props) => (
  <Image {...props} enableSkeletonFlash />
);
