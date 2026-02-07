'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DescriptionRenderer = dynamic(
  () =>
    import('../../../Description/DescriptionRenderer').then((mod) => ({
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
