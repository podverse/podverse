'use client';

import React from 'react';

import { CommonEpisodeListRow } from '../../../Common/Podcast/Episode/CommonEpisodeRow';
import type { EpisodeListRowProps } from '../../../Common/Podcast/Episode/types';

export const CoreEpisodeRow: React.FC<EpisodeListRowProps> = (props) => {
  return <CommonEpisodeListRow {...props} />;
};
