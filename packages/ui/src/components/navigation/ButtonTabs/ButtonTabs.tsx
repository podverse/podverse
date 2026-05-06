import { Button } from '../../button/Button/Button';

import styles from './ButtonTabs.module.scss';

export type ButtonTab = {
  key: string | number;
  label: string;
  onClick: () => void;
};

export type ButtonTabsProps = {
  buttonTabs: ButtonTab[];
  selectedKey: string | number;
  className?: string;
};

export function ButtonTabs({ buttonTabs, selectedKey, className = '' }: ButtonTabsProps) {
  return (
    <div className={`${styles.buttonTabs} ${className}`}>
      {buttonTabs.map((buttonTab) => (
        <Button
          key={buttonTab.key}
          variant={buttonTab.key === selectedKey ? 'miniSelected' : 'mini'}
          onClick={buttonTab.onClick}
          className={styles.tabButton}
        >
          {buttonTab.label}
        </Button>
      ))}
    </div>
  );
}
