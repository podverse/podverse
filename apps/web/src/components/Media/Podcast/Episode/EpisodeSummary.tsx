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

type EpisodeSummaryProps = {
  description?: string;
};

export const EpisodeSummary: React.FC<EpisodeSummaryProps> = ({ description }) => {
  return <DescriptionRenderer description={description || ''} />;
};
