import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../../../lib/auth/serverManagementSession';
import { canCreateAdmins } from '../../../../../lib/managementPermissions';
import { ROUTES } from '../../../../../lib/routes';
import { AdminRoleTemplatePageClient } from './AdminRoleTemplatePageClient';

export default async function NewAdminRoleTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string | string[] }>;
}) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  if (!canCreateAdmins(user)) {
    redirect(ROUTES.ADMINS);
  }

  const sp = await searchParams;
  const raw = sp.returnUrl;
  const returnUrlCandidate = Array.isArray(raw) ? raw[0] : raw;
  const returnUrl =
    typeof returnUrlCandidate === 'string' &&
    returnUrlCandidate.startsWith('/') &&
    !returnUrlCandidate.startsWith('//')
      ? returnUrlCandidate
      : ROUTES.ADMINS;

  return <AdminRoleTemplatePageClient returnUrl={returnUrl} />;
}
