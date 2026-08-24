'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { NavBarAccountMenuItem } from '@podverse/ui';
import { NavBar } from '@podverse/ui';

import { ManagementApiRequestService } from '../../lib/requests/apiRequestService';
import type { CurrentUser } from '../../lib/requests/auth';
import { ROUTES } from '../../lib/routes';

import layoutStyles from '../ManagementAppLayout/managementAppLayout.module.scss';

type ManagementNavBarProps = {
  brandName: string;
  user: CurrentUser;
};

export function ManagementNavBar({ brandName, user }: ManagementNavBarProps) {
  const tNav = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      const service = new ManagementApiRequestService();
      await service.apiRequest({ path: '/auth/logout', method: 'POST' });
    } catch {
      // proceed with redirect even if logout API fails
    }
    router.replace(ROUTES.HOME);
  }, [router]);

  const displayName = (user.email || user.username || user.id_text).trim() || '—';

  const items: NavBarAccountMenuItem[] = [
    {
      key: 'role',
      label: tNav('userRole', { role: user.role }),
      type: 'meta',
    },
    {
      href: ROUTES.SETTINGS,
      key: 'settings',
      label: tNav('mySettings'),
      type: 'link',
    },
    {
      key: 'logout',
      label: tAuth('logout'),
      onClick: () => void handleLogout(),
      type: 'action',
    },
  ];

  return (
    <NavBar
      accountMenu={{
        ariaLabel: tNav('userMenu'),
        displayName,
        isLoggedIn: true,
        items,
        LinkComponent: NextLink,
      }}
      brand={{
        children: brandName,
        href: ROUTES.DASHBOARD,
        linkClassName: layoutStyles.brandLink,
        LinkComponent: NextLink,
      }}
    />
  );
}
