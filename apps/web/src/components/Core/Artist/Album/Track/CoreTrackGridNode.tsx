'use client';

import React from 'react';

import { CommonTrackListGridNode } from '../../../../Common/Artist/Album/Track/CommonTrackGridNode';

export const CoreTrackGridNode: React.FC<React.ComponentProps<typeof CommonTrackListGridNode>> = (
  props
) => {
  return <CommonTrackListGridNode {...props} />;
};
