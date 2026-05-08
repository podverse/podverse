'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { DTOAccount } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ProfileHeader } from '../../../components/Media/Profile/ProfileHeader';
import { useAccount } from '../../../contexts/Account';
import { trackStatsAccountVisit } from '../../../utils/statsTracking/statsTracking';
import { ProfilePageContentContextProvider } from './ProfilePageContentContext';
import { ProfilePageContentList } from './ProfilePageContentList';
import { ProfilePageContentListHeader } from './ProfilePageContentListHeader';

interface ProfilePageClientProps {
  ssrAccount: DTOAccount;
}

export function ProfilePageClient(props: ProfilePageClientProps) {
  const { ssrAccount } = props;
  const { loggedInAccount } = useAccount();
  const router = useRouter();

  const isOwnProfile = loggedInAccount?.id === ssrAccount.id;

  useEffect(() => {
    // Redirect to my-profile if user is viewing their own profile
    if (loggedInAccount && loggedInAccount.id === ssrAccount.id) {
      router.replace('/my-profile');
    }
  }, [loggedInAccount, ssrAccount.id, router]);

  useEffect(() => {
    trackStatsAccountVisit(loggedInAccount?.id, ssrAccount.id, ssrAccount.id_text);
  }, [loggedInAccount?.id, ssrAccount.id, ssrAccount.id_text]);

  // Don't render if redirecting
  if (loggedInAccount && loggedInAccount.id === ssrAccount.id) {
    return null;
  }

  return (
    <ProfilePageContentContextProvider account={ssrAccount}>
      <MainWrapper>
        <ProfileHeader account={ssrAccount} isOwnProfile={isOwnProfile} />
        <MainSidebarLayout>
          <MainColumnStack>
            <ProfilePageContentListHeader />
            <ProfilePageContentList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ProfilePageContentContextProvider>
  );
}
