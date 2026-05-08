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

type LivestreamSummaryProps = {
  description?: string;
};

export const LivestreamSummary: React.FC<LivestreamSummaryProps> = ({ description }) => {
  return <DescriptionRenderer description={description || ''} />;
};
