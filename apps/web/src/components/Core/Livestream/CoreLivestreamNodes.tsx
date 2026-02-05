'use client';

import React from 'react';

import { CommonLivestreamListNodes } from '../../Common/Livestream/CommonLivestreamNodes';

export const CoreLivestreamNodes: React.FC<
  React.ComponentProps<typeof CommonLivestreamListNodes>
> = (props) => {
  return <CommonLivestreamListNodes {...props} />;
};
