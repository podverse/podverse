import type { Dispatch, SetStateAction } from 'react';
import { useState, useRef, useEffect } from 'react';

import type { PaymentRecipient, RecipientStatus } from '../types.js';

type UseBoostTestFlowParams = {
  enabled: boolean;
  paymentRecipients: PaymentRecipient[];
  toRecipientStatuses: (recipients: PaymentRecipient[]) => RecipientStatus[];
  updateRecipientStatus: (
    recipientId: string,
    status: RecipientStatus['status'],
    error?: string
  ) => void;
  setRecipientStatuses: Dispatch<SetStateAction<RecipientStatus[]>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  failedMessage: string;
};

type UseBoostTestFlowResult = {
  step: 'form' | 'summary';
  handleTestSubmit: () => void;
  goBack: () => void;
};

/** Sample error messages for mock failures so the Failed + error UI can be exercised. */
const MOCK_FAILURE_MESSAGES = [
  'Insufficient balance (mock)',
  'Route not found (mock)',
  'Payment timeout (mock)',
];

/**
 * TEMPORARY: boost test flow – mock submit with 5s per recipient, random success/fail.
 * When enabled, run mock instead of real payments; owns step and timeout cleanup.
 */
export function useBoostTestFlow({
  enabled,
  paymentRecipients,
  toRecipientStatuses,
  updateRecipientStatus,
  setRecipientStatuses,
  setIsSubmitting,
  failedMessage: _failedMessage,
}: UseBoostTestFlowParams): UseBoostTestFlowResult {
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const mockTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleTestSubmit = () => {
    if (!enabled) return;
    const eligible = paymentRecipients.filter((r) => r.final_amount > 0);
    setRecipientStatuses(toRecipientStatuses(paymentRecipients));
    setIsSubmitting(true);
    const first = eligible[0];
    if (first !== undefined) {
      updateRecipientStatus(first.id, 'paying');
    }
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    eligible.forEach((recipient, index) => {
      const delay = 5000 * (index + 1);
      const id = setTimeout(() => {
        const success = Math.random() < 0.5;
        const sampleError = MOCK_FAILURE_MESSAGES[index % MOCK_FAILURE_MESSAGES.length];
        updateRecipientStatus(
          recipient.id,
          success ? 'success' : 'failed',
          success ? undefined : sampleError
        );
        const nextIndex = index + 1;
        const nextRecipient = eligible[nextIndex];
        if (nextRecipient !== undefined) {
          updateRecipientStatus(nextRecipient.id, 'paying');
        }
      }, delay);
      timeouts.push(id);
    });
    const doneDelay = eligible.length > 0 ? 5000 * eligible.length : 0;
    const doneId = setTimeout(() => {
      mockTimeoutsRef.current = [];
      setIsSubmitting(false);
      setStep('summary');
    }, doneDelay);
    timeouts.push(doneId);
    mockTimeoutsRef.current = timeouts;
  };

  const goBack = () => {
    setRecipientStatuses([]);
    setStep('form');
  };

  useEffect(() => {
    return () => {
      mockTimeoutsRef.current.forEach(clearTimeout);
      mockTimeoutsRef.current = [];
    };
  }, []);

  return { step, handleTestSubmit, goBack };
}
