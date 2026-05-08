import type { ReactNode } from 'react';

import styles from './MembershipAdvancedOverridesGroup.module.scss';

export type MembershipAdvancedOverridesGroupProps = {
  children: ReactNode;
};

export function MembershipAdvancedOverridesGroup({
  children,
}: MembershipAdvancedOverridesGroupProps) {
  return (
    <div className={styles.inset} role="group">
      {children}
    </div>
  );
}
