'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DescriptionRenderer = dynamic(
  () =>
    import('../../../../Description/DescriptionRenderer').then((mod) => ({
      default: mod.DescriptionRenderer,
    })),
  { loading: () => <div /> }
);

type TrackSummaryProps = {
  description?: string;
};

export const TrackSummary: React.FC<TrackSummaryProps> = ({ description }) => {
  return <DescriptionRenderer description={description || ''} />;
};
