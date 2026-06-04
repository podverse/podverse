import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { SharableStatusEnum } from '@podverse/helpers';

import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { buildStaticPageMetadata } from '../../../lib/seo/buildStaticPageMetadata';
import { getAccountForSeoPage } from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';

export type ProfilePageProps = {
  params: Promise<{ id_text: string }>;
};

const isProfileIndexable = (sharableStatusId?: number): boolean => {
  // sharable_status_id: 1 public, 2 unlisted, 3 private
  return sharableStatusId === SharableStatusEnum.Public;
};

const resolveProfileTitle = (idText: string, displayName?: string | null): string => {
  const normalizedDisplayName = displayName?.trim();
  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }

  return `Profile ${idText}`;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  try {
    const { id_text } = await params;
    const account = await getAccountForSeoPage(id_text);
    if (!account || !isProfileIndexable(account.sharable_status_id)) {
      return buildNoindexMetadata('Profile');
    }

    const title = resolveProfileTitle(id_text, account.account_profile?.display_name);
    const descriptionPlain = toSeoPlainText(account.account_profile?.bio || 'Podverse profile page');

    return buildStaticPageMetadata({
      title,
      descriptionPlain,
      pathname: `/profile/${account.id_text}`,
    });
  } catch {
    return buildNoindexMetadata('Profile');
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id_text } = await params;

  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  try {
    const ssrAccount = await getAccountForSeoPage(id_text);

    if (!ssrAccount) {
      // Account not found or not accessible
      redirect('/profiles');
      return;
    }

    // Check if user is viewing their own profile
    if (isValidAuthSession) {
      const ssrLoggedInAccount = await ssrApiRequestService.reqAuthMe();

      if (ssrLoggedInAccount) {
        if (ssrLoggedInAccount.id === ssrAccount.id) {
          // Redirect to my-profile if user views their own profile via public link
          redirect('/my-profile');
          return;
        }
      }
    }

    // Import ProfileClient dynamically to avoid circular dependencies
    const { ProfilePageClient } = await import('./ProfilePageClient');

    return <ProfilePageClient ssrAccount={ssrAccount} />;
  } catch (error) {
    // Check if this is a Next.js redirect error - if so, re-throw it
    if (error && typeof error === 'object') {
      const errorDigest = Reflect.get(error, 'digest');
      if (typeof errorDigest === 'string' && errorDigest.includes('NEXT_REDIRECT')) {
        throw error;
      }
    }

    // Account not found or error accessing account
    redirect('/profiles');
  }
}
