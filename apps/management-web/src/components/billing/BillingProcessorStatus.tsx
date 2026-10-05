'use client';

import { useTranslations } from 'next-intl';

import { Alert, DescriptionList, DescriptionListRow, SectionHeading } from '@podverse/ui';

import type { BillingProcessorStatusRow } from '../../lib/requests/billing';

export type BillingProcessorStatusProps = {
  rows: BillingProcessorStatusRow[];
};

function processorLabel(
  processorId: BillingProcessorStatusRow['processor_id'],
  labels: { paypal: string; apple: string; google_play: string }
): string {
  switch (processorId) {
    case 'paypal':
      return labels.paypal;
    case 'apple':
      return labels.apple;
    case 'google_play':
      return labels.google_play;
    default: {
      const unexpected: never = processorId;
      return unexpected;
    }
  }
}

export function BillingProcessorStatus({ rows }: BillingProcessorStatusProps) {
  const t = useTranslations('billing');
  const labels = {
    paypal: t('processors.paypal'),
    apple: t('processors.apple'),
    google_play: t('processors.google_play'),
  };
  const anyOff = rows.some((row) => row.enabled === false);

  return (
    <section>
      <SectionHeading>{t('processors.title')}</SectionHeading>
      <DescriptionList variant="flat">
        {rows.map((row) => (
          <DescriptionListRow
            key={row.processor_id}
            detail={row.enabled ? t('processors.enabled') : t('processors.disabled')}
            term={processorLabel(row.processor_id, labels)}
          />
        ))}
      </DescriptionList>
      {anyOff ? <Alert variant="default">{t('processors.offNotice')}</Alert> : null}
    </section>
  );
}
