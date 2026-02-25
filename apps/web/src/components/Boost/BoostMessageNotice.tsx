import { FaCircleQuestion } from 'react-icons/fa6';

import { IconButton } from '../Media/Header/IconButton';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostMessageNoticeProps = {
  tValue: Translator;
  /** When true, use app-donation message instead of podcast message. */
  isAppDonate?: boolean;
};

export const BoostMessageNotice = ({ tValue, isAppDonate = false }: BoostMessageNoticeProps) => {
  const notEnabledKey = isAppDonate
    ? 'boost_messages.not_enabled_app'
    : 'boost_messages.not_enabled';
  const moreInfoLabel = tValue('boost_messages.more_info');
  return (
    <div className={styles.boostMessageNotice}>
      <span>{tValue(notEnabledKey)}</span>
      <IconButton
        href="/v4v/boost-messages"
        ariaLabel={moreInfoLabel}
        title={moreInfoLabel}
        color="secondary"
        className={styles.helpIcon}
      >
        <FaCircleQuestion />
      </IconButton>
    </div>
  );
};
