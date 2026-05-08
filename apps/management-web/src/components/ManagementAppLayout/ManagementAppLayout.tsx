import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppWrapper } from '@podverse/ui';

import { getConfig } from '../../config';
import { getManagementSessionUser } from '../../lib/auth/serverManagementSession';
import { ManagementNavBar } from '../ManagementNavBar/ManagementNavBar';

import styles from './managementAppLayout.module.scss';

type ManagementAppLayoutProps = {
  children: ReactNode;
};

export async function ManagementAppLayout({ children }: ManagementAppLayoutProps) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  const config = getConfig();
  const brandName = config.public.brand.name ?? 'Management';

  return (
    <div className={styles.shell}>
      <ManagementNavBar brandName={brandName} user={user} />
      <AppWrapper direction="column">{children}</AppWrapper>
    </div>
  );
}
