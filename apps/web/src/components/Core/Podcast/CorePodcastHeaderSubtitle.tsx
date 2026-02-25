'use client';

import type { DTOChannel } from '@podverse/helpers';
import React from 'react';

import { CorePodcastHeaderCategories } from './CorePodcastHeaderCategories';

type CorePodcastHeaderSubtitleProps = {
  channel: DTOChannel;
};

export const CorePodcastHeaderSubtitle: React.FC<CorePodcastHeaderSubtitleProps> = ({
  channel,
}) => {
  const channel_about = channel.channel_about;
  const author = channel_about?.author;
  const channel_categories = channel.channel_categories;
  const hasChannelCategories = channel_categories && channel_categories.length > 0;

  return (
    <div>
      <span>{author}</span>
      {author && hasChannelCategories && ' • '}
      <CorePodcastHeaderCategories channel_categories={channel_categories} />
    </div>
  );
};
