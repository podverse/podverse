'use client';

import { useState } from 'react';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { getPopularityTrackingAbridgedMarkdown } from '@podverse/helpers';

import { PopularityTrackingDecisionActions } from './PopularityTrackingDecisionActions';
import { PopularityTrackingMarkdown } from './PopularityTrackingMarkdown';

type PopularityTrackingAgreementPanelProps = {
  agreement: DTOPopularityTrackingAgreement | null;
  onDecided?: () => void;
};

export function PopularityTrackingAgreementPanel({
  agreement,
  onDecided,
}: PopularityTrackingAgreementPanelProps) {
  const [showFullAgreement, setShowFullAgreement] = useState(false);
  const markdown =
    agreement === null
      ? null
      : showFullAgreement
        ? agreement.markdown
        : getPopularityTrackingAbridgedMarkdown(agreement.markdown);

  return (
    <>
      {markdown !== null ? <PopularityTrackingMarkdown markdown={markdown} /> : null}
      <PopularityTrackingDecisionActions
        onDecided={onDecided}
        onToggleFullAgreement={() => {
          setShowFullAgreement((current) => !current);
        }}
        showFullAgreement={showFullAgreement}
      />
    </>
  );
}
