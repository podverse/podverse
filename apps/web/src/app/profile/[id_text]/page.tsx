import type { Metadata } from 'next';
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from 'next/dist/client/components/http-access-fallback/http-access-fallback';
import { redirect } from 'next/navigation';

import { buildProfilePath, SharableStatusEnum } from '@podverse/helpers';

import { getConfigResolved } from '../../../config/loadPublicClientConfig.server';
import { ROUTES } from '../../../constants/routes';
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

/**
 * A missing account, or one private to the viewer, sends the visitor to the profiles list.
 * `getAccountForSeoPage` turns the API 404 into the Next.js not-found signal; every other failure
 * propagates to the error page.
 */
const getAccountOrRedirectToProfiles = async (idText: string) => {
  try {
    return await getAccountForSeoPage(idText);
  } catch (error) {
    if (isHTTPAccessFallbackError(error) && getAccessFallbackHTTPStatus(error) === 404) {
      redirect(ROUTES.PROFILES);
    }
    throw error;
  }
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  try {
    const { id_text } = await params;
    const account = await getAccountForSeoPage(id_text);
    if (!account || !isProfileIndexable(account.sharable_status_id)) {
      return buildNoindexMetadata('Profile');
    }

    const title = resolveProfileTitle(id_text, account.account_profile?.display_name);
    const descriptionPlain = toSeoPlainText(
      account.account_profile?.bio || 'Podverse profile page'
    );

    const brandName = (await getConfigResolved()).public.brand.name;
    return buildStaticPageMetadata({
      title,
      descriptionPlain,
      pathname: buildProfilePath(account.id_text),
      brandName,
    });
  } catch {
    return buildNoindexMetadata('Profile');
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id_text } = await params;

  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();
  const ssrAccount = await getAccountOrRedirectToProfiles(id_text);

  if (isValidAuthSession) {
    const ssrLoggedInAccount = await ssrApiRequestService.reqAuthMe();
    if (ssrLoggedInAccount.id === ssrAccount.id) {
      redirect(ROUTES.MY_PROFILE);
    }
  }

  // Import ProfileClient dynamically to avoid circular dependencies
  const { ProfilePageClient } = await import('./ProfilePageClient');

  return <ProfilePageClient ssrAccount={ssrAccount} />;
}
