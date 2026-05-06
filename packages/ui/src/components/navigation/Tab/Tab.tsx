import classNames from 'classnames';

import styles from './Tab.module.scss';

export type TabProps = {
  label: string;
  selected?: boolean;
  onClick: () => void;
  zIndex: number;
  hideDesktop?: boolean;
};

export function Tab({ label, selected = false, onClick, zIndex, hideDesktop }: TabProps) {
  return (
    <button
      className={classNames(
        styles.tab,
        hideDesktop ? styles.hideDesktop : null,
        selected ? styles.selected : null
      )}
      onClick={onClick}
      type="button"
      style={{ zIndex }}
    >
      {label}
    </button>
  );
}
