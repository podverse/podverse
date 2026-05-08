import { WebLoadingSpinnerDecorativeSmall } from '../LoadingSpinner/WebLoadingSpinnerDecorative';
import type { RecipientStatus } from './types.js';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostRecipientStatusListProps = {
  recipientStatuses: RecipientStatus[];
  tValue: Translator;
  selectedValueKey?: string | null;
};

export const BoostRecipientStatusList = ({
  recipientStatuses,
  tValue,
  selectedValueKey = null,
}: BoostRecipientStatusListProps) => {
  if (recipientStatuses.length === 0) {
    return null;
  }

  const denominationKey = selectedValueKey
    ? `types.${selectedValueKey}.denomination`
    : 'types.lightning.denomination';

  return (
    <div className={styles.recipientStatusList}>
      {recipientStatuses.map((recipient) => (
        <div key={recipient.id} className={styles.recipientStatusItem}>
          <div className={styles.recipientStatusMeta}>
            <div>{recipient.name || recipient.address}</div>
            <div className={styles.recipientStatusAddress}>{recipient.address}</div>
          </div>
          <div className={styles.recipientStatusAmount}>
            {recipient.final_amount} {tValue(denominationKey)}
          </div>
          <div className={styles[`status_${recipient.status}`]}>
            {recipient.status === 'pending' && tValue('boost_messages.status_pending')}
            {recipient.status === 'paying' && (
              <span className={styles.statusPayingRow}>
                {tValue('boost_messages.status_paying')}
                <WebLoadingSpinnerDecorativeSmall />
              </span>
            )}
            {recipient.status === 'success' && tValue('boost_messages.status_success')}
            {recipient.status === 'failed' && (
              <>
                {tValue('boost_messages.status_failed')}
                {recipient.errorDetails !== undefined && recipient.errorDetails.length > 0
                  ? recipient.errorDetails.map((line, idx) => (
                      <div key={idx} className={styles.recipientStatusError}>
                        {idx === 0
                          ? line
                          : tValue('boost_messages.retry_attempt', { number: idx + 1 }) + line}
                      </div>
                    ))
                  : null}
                {recipient.errorDetails === undefined &&
                  recipient.error !== undefined &&
                  recipient.error !== '' &&
                  recipient.error !== tValue('boost_messages.status_failed') && (
                    <div className={styles.recipientStatusError}>{recipient.error}</div>
                  )}
                {recipient.errorProviderMessage !== undefined &&
                  recipient.errorProviderMessage !== '' &&
                  (recipient.error === undefined ||
                    !recipient.error.includes(recipient.errorProviderMessage)) &&
                  (recipient.errorDetails === undefined || recipient.errorDetails.length === 0) && (
                    <div className={styles.recipientStatusError}>
                      {recipient.errorProviderMessage}
                    </div>
                  )}
              </>
            )}
            {recipient.status === 'paying' &&
              recipient.errorDetails !== undefined &&
              recipient.errorDetails.length > 0 && (
                <div className={styles.recipientStatusError}>
                  {recipient.errorDetails.map((line, idx) => (
                    <div key={idx}>
                      {idx === 0
                        ? line
                        : tValue('boost_messages.retry_attempt', { number: idx + 1 }) + line}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
};
