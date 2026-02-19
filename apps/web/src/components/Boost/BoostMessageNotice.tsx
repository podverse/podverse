import Link from 'next/link';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostMessageNoticeProps = {
  tValue: Translator;
};

export const BoostMessageNotice = ({ tValue }: BoostMessageNoticeProps) => (
  <div className={styles.boostMessageNotice}>
    <div>{tValue('boost_messages.not_enabled')}</div>
    <Link href="/v4v/boost-messages">{tValue('boost_messages.more_info')}</Link>
  </div>
);
