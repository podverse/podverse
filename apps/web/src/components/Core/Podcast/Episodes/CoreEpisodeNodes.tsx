'use client';

import React from 'react';

import { CommonEpisodeListNodes } from '../../../Common/Podcast/Episode/CommonEpisodeNodes';
import type { EpisodeListNodesProps } from '../../../Common/Podcast/Episode/types';

export const CoreEpisodeNodes: React.FC<EpisodeListNodesProps> = (props) => {
  return <CommonEpisodeListNodes {...props} />;
};
