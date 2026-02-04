'use client';

import React from 'react';

import { CommonTrackListNodes } from '../../../../Common/Artist/Album/Track/CommonTrackNodes';

export const CoreTrackNodes: React.FC<React.ComponentProps<typeof CommonTrackListNodes>> = (
  props
) => {
  return <CommonTrackListNodes {...props} />;
};
