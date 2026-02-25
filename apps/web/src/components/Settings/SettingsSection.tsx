import React from 'react';
import styles from '../../styles/components/Settings/SettingsSection.module.scss';

type SettingsSectionProps = {
  children: React.ReactNode;
  noVerticalMargin?: boolean;
};

export function SettingsSection({ children, noVerticalMargin }: SettingsSectionProps) {
  const className = noVerticalMargin
    ? `${styles.section} ${styles.sectionNoVerticalMargin}`
    : styles.section;
  return <div className={className}>{children}</div>;
}
