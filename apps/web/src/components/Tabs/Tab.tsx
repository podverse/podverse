import React from 'react';
import styles from '../../styles/components/Tabs/Tab.module.scss';
import classNames from 'classnames';
import { cssClass } from '../../utils/cssModule';

type TabProps = {
  label: string;
  selected?: boolean;
  onClick: () => void;
  zIndex: number;
  hideDesktop?: boolean;
};

export const Tab: React.FC<TabProps> = ({ label, selected = false, onClick, zIndex, hideDesktop }) => {
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
