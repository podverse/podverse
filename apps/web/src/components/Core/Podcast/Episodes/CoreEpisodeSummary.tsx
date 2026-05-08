'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DescriptionRenderer = dynamic(
  () =>
    import('@podverse/ui').then((mod) => ({
      default: mod.DescriptionRenderer,
    })),
  { loading: () => <div /> }
);

type CoreEpisodeSummaryProps = {
  description?: string;
};

export const CoreEpisodeSummary: React.FC<CoreEpisodeSummaryProps> = ({ description }) => {
  return <DescriptionRenderer description={description || ''} />;
};
