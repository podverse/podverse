import type { AppValueRecipient } from '@podverse/helpers';
import styles from '../../styles/components/Boost/BoostRecipientInfoRow.module.scss';

type BoostRecipientInfoRowProps = {
  recipient:
    | AppValueRecipient
    | {
        name?: string | null;
        address: string;
        normalized_split: number;
        final_amount: number;
      };
  showPercentColumn?: boolean;
};

export const BoostRecipientInfoRow = ({
  recipient,
  showPercentColumn = true,
}: BoostRecipientInfoRowProps) => {
  return (
    <tr className={styles.row}>
      <td>
        <div>{recipient.name ?? null}</div>
        <div className={styles.address}>{recipient.address}</div>
      </td>
      {showPercentColumn && <td className={styles.percent}>{recipient.normalized_split}</td>}
      <td className={styles.amount}>{recipient.final_amount}</td>
    </tr>
  );
};
