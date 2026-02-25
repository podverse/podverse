'use client';

import React from 'react';

import { CommonLivestreamListRow } from '../../Common/Livestream/CommonLivestreamRow';

export const CoreLivestreamRow: React.FC<React.ComponentProps<typeof CommonLivestreamListRow>> = (
  props
) => {
  return <CommonLivestreamListRow {...props} />;
};
