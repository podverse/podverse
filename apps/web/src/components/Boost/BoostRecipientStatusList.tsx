import type { RecipientStatus } from './types.js';

import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostRecipientStatusListProps = {
  recipientStatuses: RecipientStatus[];
  tValue: Translator;
};

export const BoostRecipientStatusList = ({
  recipientStatuses,
  tValue,
}: BoostRecipientStatusListProps) => {
  if (recipientStatuses.length === 0) {
    return null;
  }

  return (
    <div className={styles.recipientStatusList}>
      {recipientStatuses.map((recipient) => (
        <div key={recipient.id} className={styles.recipientStatusItem}>
          <div className={styles.recipientStatusMeta}>
            <div>{recipient.name || recipient.address}</div>
            <div className={styles.recipientStatusAddress}>{recipient.address}</div>
          </div>
          <div className={styles.recipientStatusAmount}>
            {recipient.final_amount} {tValue('types.lightning_keysend.denomination')}
          </div>
          <div className={styles[`status_${recipient.status}`]}>
            {recipient.status === 'pending' && tValue('boost_messages.status_pending')}
            {recipient.status === 'paying' && (
              <span className={styles.statusPayingRow}>
                {tValue('boost_messages.status_paying')}
                <LoadingSpinner size="small" />
              </span>
            )}
            {recipient.status === 'success' && tValue('boost_messages.status_success')}
            {recipient.status === 'failed' && (
              <>
                {tValue('boost_messages.status_failed')}
                {recipient.error !== undefined &&
                  recipient.error !== '' &&
                  recipient.error !== tValue('boost_messages.status_failed') && (
                    <div className={styles.recipientStatusError}>{recipient.error}</div>
                  )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
