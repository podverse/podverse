'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ManagementApiRequestService } from '../../lib/requests/apiRequestService';
import { type CurrentUser } from '../../lib/requests/auth';

type DashboardNavRightProps = {
  user: CurrentUser;
};

export function DashboardNavRight({ user }: DashboardNavRightProps) {
  const router = useRouter();
  const t = useTranslations('auth');

  const handleLogout = async () => {
    try {
      const service = new ManagementApiRequestService();
      await service.apiRequest({ path: '/auth/logout', method: 'POST' });
    } catch {
      // proceed with redirect even if logout API fails
    }
    router.replace('/');
  };

  return (
    <span>
      {user.id_text} ({user.role}){' '}
      <button onClick={handleLogout} type="button">
        {t('logout')}
      </button>
    </span>
  );
}
