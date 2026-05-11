import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { canCreateAdmins } from '../../../../../lib/managementPermissions';
import { AdminRoleTemplatePageClient } from './AdminRoleTemplatePageClient';

export default async function NewAdminRoleTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string | string[] }>;
}) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (!canCreateAdmins(user)) {
    redirect('/admins');
  }

  const sp = await searchParams;
  const raw = sp.returnUrl;
  const returnUrlCandidate = Array.isArray(raw) ? raw[0] : raw;
  const returnUrl =
    typeof returnUrlCandidate === 'string' &&
    returnUrlCandidate.startsWith('/') &&
    !returnUrlCandidate.startsWith('//')
      ? returnUrlCandidate
      : '/admins';

  return <AdminRoleTemplatePageClient returnUrl={returnUrl} />;
}
