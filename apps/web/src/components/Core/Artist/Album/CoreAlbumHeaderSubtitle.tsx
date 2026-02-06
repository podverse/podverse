import type { DTOChannel } from '@podverse/helpers';
import React from 'react';

type CoreAlbumHeaderSubtitleProps = {
  channel: DTOChannel;
};

export const CoreAlbumHeaderSubtitle: React.FC<CoreAlbumHeaderSubtitleProps> = ({ channel }) => {
  const channel_about = channel.channel_about;
  const author = channel_about?.author;

  return (
    <div>
      <span>{author}</span>
    </div>
  );
};
