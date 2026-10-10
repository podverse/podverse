'use client';

import { useRouter } from 'next/navigation';

import { PopularityAgreementGate } from '../../components/Legal/PopularityAgreementGate';
import { ROUTES } from '../../constants/routes';

export default function PopularityTrackingPage() {
  const router = useRouter();

  return (
    <PopularityAgreementGate
      onDecided={() => {
        router.push(`${ROUTES.SETTINGS}?tab=account`);
      }}
    />
  );
}
