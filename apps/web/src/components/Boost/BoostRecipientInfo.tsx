'use client';

import { useTranslations } from 'next-intl';

import type {
  AppValueRecipient,
  DTOChannelValueRecipient,
  DTOItemValueRecipient,
} from '@podverse/helpers';
import { calculateRecipientAmounts } from '@podverse/v4v-helpers';

import { BoostRecipientInfoRow } from './BoostRecipientInfoRow';

import styles from '../../styles/components/Boost/BoostRecipientInfo.module.scss';

type BoostRecipientInfoProps = {
  channel_value_recipients?: DTOChannelValueRecipient[];
  item_value_recipients?: DTOItemValueRecipient[];
  app_value_recipient?: AppValueRecipient | null;
  totalAmountToCreator: number;
  totalAmountToApp: number;
  showAppRecipient?: boolean;
};

export const BoostRecipientInfo = ({
  channel_value_recipients,
  item_value_recipients,
  app_value_recipient,
  totalAmountToCreator,
  totalAmountToApp: _totalAmountToApp,
  showAppRecipient = true,
}: BoostRecipientInfoProps) => {
  const tValue = useTranslations('value');

  const normalized_channel_value_recipients = channel_value_recipients
    ? calculateRecipientAmounts(channel_value_recipients, totalAmountToCreator)
    : [];
  const normalized_item_value_recipients = item_value_recipients
    ? calculateRecipientAmounts(item_value_recipients, totalAmountToCreator)
    : [];

  const creatorRecipients =
    normalized_item_value_recipients.length > 0
      ? normalized_item_value_recipients
      : normalized_channel_value_recipients;

  const shouldShowAppRecipient = showAppRecipient && app_value_recipient;

  if (creatorRecipients.length === 0 && !shouldShowAppRecipient) {
    return null;
  }

  const creatorHeaderLabel =
    creatorRecipients.length > 1
      ? tValue('recipient.creator_recipients')
      : tValue('recipient.creator_recipient');

  const showCreatorPercentColumn = creatorRecipients.length > 1;

  const creatorRows = creatorRecipients.map((recipient, index) => (
    <BoostRecipientInfoRow
      key={index}
      recipient={recipient}
      showPercentColumn={showCreatorPercentColumn}
    />
  ));

  return (
    <div className={styles.tablesStack}>
      {creatorRecipients.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th>{creatorHeaderLabel}</th>
              {showCreatorPercentColumn && <th>%</th>}
              <th>{tValue('total')}</th>
            </tr>
          </thead>
          <tbody>{creatorRows}</tbody>
        </table>
      )}
      {shouldShowAppRecipient && (
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th>{tValue('recipient.app_recipient')}</th>
              <th>{tValue('total')}</th>
            </tr>
          </thead>
          <tbody>
            <BoostRecipientInfoRow recipient={app_value_recipient} showPercentColumn={false} />
          </tbody>
        </table>
      )}
    </div>
  );
};
