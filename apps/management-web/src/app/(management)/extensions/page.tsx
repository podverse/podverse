import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getRuntimeConfig } from '../../../config/runtime-config-store';
import {
  getManagementSessionUser,
  MANAGEMENT_AUTH_COOKIE_NAME,
} from '../../../lib/auth/serverManagementSession';
import { canManageExtensions } from '../../../lib/managementPermissions';
import { reqExtensionsList } from '../../../lib/requests/extensions';
import { ExtensionsListPageClient } from './ExtensionsListPageClient';

export default async function ExtensionsPage() {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (!canManageExtensions(user)) {
    redirect('/dashboard');
  }

  if (getRuntimeConfig().env.EXTENSIONS_ENABLED !== 'true') {
    redirect('/dashboard');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGEMENT_AUTH_COOKIE_NAME)?.value ?? '';
  if (token === '') {
    redirect('/');
  }

  try {
    const extensions = await reqExtensionsList(token);
    return <ExtensionsListPageClient initialExtensions={extensions} />;
  } catch {
    redirect('/dashboard');
  }
}
