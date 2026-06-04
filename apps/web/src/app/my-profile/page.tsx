import { redirect } from 'next/navigation';

import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { MyProfilePageClient } from './MyProfilePageClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function MyProfilePage() {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  if (!isValidAuthSession) {
    redirect('/');
    return;
  }

  try {
    const ssrAccount = await ssrApiRequestService.reqAuthMe();

    if (!ssrAccount) {
      redirect('/');
      return;
    }

    return <MyProfilePageClient ssrAccount={ssrAccount} />;
  } catch {
    redirect('/');
  }
}
