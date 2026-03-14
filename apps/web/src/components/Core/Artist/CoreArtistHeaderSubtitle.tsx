import React from 'react';

import type { DTOChannel } from '@podverse/helpers';

type CoreArtistHeaderSubtitleProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderSubtitle: React.FC<CoreArtistHeaderSubtitleProps> = ({ channel }) => {
  const channel_about = channel.channel_about;
  const author = channel_about?.author;

  return (
    <div>
      <span>{author}</span>
    </div>
  );
};
