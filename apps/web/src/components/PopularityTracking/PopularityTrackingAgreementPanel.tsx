'use client';

import { useState } from 'react';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { getCopyMarkdownIntro } from '@podverse/helpers';

import { WebLoadingSpinnerOverlay } from '../LoadingSpinner/WebLoadingSpinnerOverlay';
import { CopyMarkdown } from '../Markdown/CopyMarkdown';
import { PopularityTrackingDecisionActions } from './PopularityTrackingDecisionActions';

type PopularityTrackingAgreementPanelProps = {
  agreement: DTOPopularityTrackingAgreement | null;
  hasError?: boolean;
  isLoading?: boolean;
  onDecided?: () => void;
};

export function PopularityTrackingAgreementPanel({
  agreement,
  hasError = false,
  isLoading = false,
  onDecided,
}: PopularityTrackingAgreementPanelProps) {
  const [showFullAgreement, setShowFullAgreement] = useState(false);
  const markdown =
    agreement === null
      ? null
      : showFullAgreement
        ? agreement.markdown
        : getCopyMarkdownIntro(agreement.markdown);
  const isCopyVisible = markdown !== null && !isLoading && !hasError;
  const showSpinnerOverlay = isLoading || hasError || !isCopyVisible;

  return (
    <div style={{ position: 'relative' }}>
      {markdown !== null ? <CopyMarkdown markdown={markdown} /> : null}
      {showSpinnerOverlay ? <WebLoadingSpinnerOverlay /> : null}
      <PopularityTrackingDecisionActions
        disabled={!isCopyVisible}
        onDecided={onDecided}
        onToggleFullAgreement={() => {
          setShowFullAgreement((current) => !current);
        }}
        showFullAgreement={showFullAgreement}
      />
    </div>
  );
}
