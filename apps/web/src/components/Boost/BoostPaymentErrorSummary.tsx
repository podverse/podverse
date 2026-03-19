'use client';

import type { RecipientStatus } from './types.js';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostPaymentErrorSummaryProps = {
  recipientStatuses: RecipientStatus[];
  tValue: Translator;
};

/**
 * Renders only when there are failed recipients. Shows retry info and error messages
 * below the status list so the user can see what went wrong.
 */
export const BoostPaymentErrorSummary = ({
  recipientStatuses,
  tValue,
}: BoostPaymentErrorSummaryProps) => {
  const failed = recipientStatuses.filter((r) => r.status === 'failed');
  if (failed.length === 0) {
    return null;
  }

  const maxRetries = failed.reduce(
    (max, r) => (r.errorRetries !== undefined && r.errorRetries > max ? r.errorRetries : max),
    0
  );
  const anyRetries = maxRetries > 0;

  return (
    <div
      className={styles.paymentErrorSummary}
      role="region"
      aria-label={tValue('boost_messages.error_details_heading')}
    >
      <h3 className={styles.paymentErrorSummaryHeading}>
        {tValue('boost_messages.error_details_heading')}
      </h3>
      {anyRetries && (
        <p className={styles.paymentErrorSummaryRetries}>
          {tValue('boost_messages.retried_requests', { count: maxRetries })}
        </p>
      )}
      <ul className={styles.paymentErrorSummaryList}>
        {failed.map((r) => (
          <li key={r.id}>
            <span className={styles.paymentErrorSummaryRecipient}>{r.name ?? r.address}:</span>{' '}
            {r.errorDetails !== undefined && r.errorDetails.length > 0 ? (
              <>
                {tValue('boost_messages.status_failed')}
                <div className={styles.paymentErrorSummaryAttempts}>
                  {r.errorDetails.map((line, idx) => (
                    <div key={idx}>
                      {idx === 0
                        ? line
                        : tValue('boost_messages.retry_attempt', { number: idx + 1 }) + line}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {r.error ?? tValue('boost_messages.status_failed')}
                {r.errorProviderMessage !== undefined &&
                  r.errorProviderMessage !== '' &&
                  (r.error === undefined || !r.error.includes(r.errorProviderMessage)) && (
                    <>
                      <br />
                      <span className={styles.paymentErrorSummaryProviderMessage}>
                        {r.errorProviderMessage}
                      </span>
                    </>
                  )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
