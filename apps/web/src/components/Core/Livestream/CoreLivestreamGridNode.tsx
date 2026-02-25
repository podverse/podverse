'use client';

import React from 'react';

import { CommonLivestreamListGridNode } from '../../Common/Livestream/CommonLivestreamGridNode';

export const CoreLivestreamGridNode: React.FC<
  React.ComponentProps<typeof CommonLivestreamListGridNode>
> = (props) => {
  return <CommonLivestreamListGridNode {...props} />;
};
