'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';

import { DescriptionTruncationNotice } from '../../../Content/Description/DescriptionTruncationNotice';
import { NoResults } from '../../../NoResults/NoResults';

const DescriptionRenderer = dynamic(
  () =>
    import('@podverse/ui').then((mod) => ({
      default: mod.DescriptionRenderer,
    })),
  { loading: () => <div /> }
);

type CoreEpisodeSummaryProps = {
  description?: string;
  onDescriptionClock?: (seconds: number) => void;
  descriptionClockLabel?: (clockText: string) => string;
  isTruncated?: boolean;
  fullNotesUrl?: string | null;
};

/**
 * Item Summary: description prose, then the truncation notice when the stored notes were
 * shortened. People are a separate chip.
 */
export const CoreEpisodeSummary: React.FC<CoreEpisodeSummaryProps> = ({
  description,
  descriptionClockLabel,
  onDescriptionClock,
  isTruncated,
  fullNotesUrl,
}) => {
  const tInfo = useTranslations('info');
  const hasDescription = description !== undefined && description.length > 0;
  if (!hasDescription) {
    return <NoResults message={tInfo('summary.no_summary')} role="status" />;
  }

  return (
    <div>
      <DescriptionRenderer
        description={description || ''}
        descriptionClockLabel={descriptionClockLabel}
        onDescriptionClock={onDescriptionClock}
      />
      {isTruncated ? <DescriptionTruncationNotice kind="item" linkUrl={fullNotesUrl} /> : null}
    </div>
  );
};
