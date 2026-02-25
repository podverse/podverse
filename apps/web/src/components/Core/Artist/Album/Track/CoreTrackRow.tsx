'use client';

import React from 'react';

import { CommonTrackListRow } from '../../../../Common/Artist/Album/Track/CommonTrackListRow';

export const CoreTrackRow: React.FC<React.ComponentProps<typeof CommonTrackListRow>> = (props) => {
  return <CommonTrackListRow {...props} />;
};
