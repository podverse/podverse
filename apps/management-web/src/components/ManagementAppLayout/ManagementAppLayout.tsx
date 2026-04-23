import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { NavBar } from '@podverse/ui';

import { DashboardNavRight } from '../../app/(management)/dashboard/DashboardNavRight';
import { getConfig } from '../../config';
import { getManagementSessionUser } from '../../lib/auth/serverManagementSession';

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
  const brandName = config.public.brand.name ?? 'Podverse Management';

  return (
    <>
      <NavBar
        brand={
          <a href="/dashboard" className={styles.brandLink}>
            {brandName}
          </a>
        }
        right={<DashboardNavRight user={user} />}
      />
      {children}
    </>
  );
}
