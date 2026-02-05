'use client';

import React from 'react';

import { CommonEpisodeListGridNode } from '../../../Common/Podcast/Episode/CommonEpisodeGridNode';
import type { EpisodeListGridNodeProps } from '../../../Common/Podcast/Episode/types';

export const CoreEpisodeGridNode: React.FC<EpisodeListGridNodeProps> = (props) => {
  return <CommonEpisodeListGridNode {...props} />;
};
