import { redirect } from 'next/navigation';

import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { NotificationsPageClient } from './NotificationsPageClient';

export default async function NotificationsPage() {
  const { isValidAuthSession } = await getSSRAuthService();
  if (!isValidAuthSession) {
    redirect('/');
  }

  return <NotificationsPageClient />;
}
