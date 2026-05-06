import { Tab } from '../Tab/Tab';

import styles from './Tabs.module.scss';

export type TabData = {
  key: string;
  label: string;
  onClick: () => void;
  zIndex: number;
  hideDesktop?: boolean;
};

export type TabsData = TabData;

export type TabsProps = {
  tabData: TabData[];
  selectedKey: string;
};

export function Tabs({ tabData, selectedKey }: TabsProps) {
  return (
    <div className={styles.tabs}>
      {tabData.map((tab) => (
        <Tab
          key={tab.key}
          label={tab.label}
          onClick={tab.onClick}
          selected={tab.key === selectedKey}
          hideDesktop={tab.hideDesktop}
          zIndex={tab.zIndex}
        />
      ))}
    </div>
  );
}
