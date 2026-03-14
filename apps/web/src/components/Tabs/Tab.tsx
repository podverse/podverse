import classNames from 'classnames';
import React from 'react';

import { cssClass } from '../../utils/cssModule';

import styles from '../../styles/components/Tabs/Tab.module.scss';

type TabProps = {
  label: string;
  selected?: boolean;
  onClick: () => void;
  zIndex: number;
  hideDesktop?: boolean;
};

export const Tab: React.FC<TabProps> = ({
  label,
  selected = false,
  onClick,
  zIndex,
  hideDesktop,
}) => {
  return (
    <button
      className={classNames(styles.tab, {
        [cssClass(styles, 'hideDesktop')]: hideDesktop,
        [cssClass(styles, 'selected')]: selected,
      })}
      onClick={onClick}
      type="button"
      style={{ zIndex }}
    >
      {label}
    </button>
  );
};
