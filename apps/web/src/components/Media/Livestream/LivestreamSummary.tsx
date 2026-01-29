'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DescriptionRenderer = dynamic(
  () =>
    import('../../Description/DescriptionRenderer').then((mod) => ({
      default: mod.DescriptionRenderer,
    })),
  { loading: () => <div /> }
);

type LivestreamSummaryProps = {
  description?: string;
};

export const LivestreamSummary: React.FC<LivestreamSummaryProps> = ({ description }) => {
  return <DescriptionRenderer description={description || ''} />;
};
