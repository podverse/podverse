'use client';

import type { DTOAccount } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import type { ProfilesPageQueryParams } from './ProfilesPageContext';
import { ProfilesPageContextProvider } from './ProfilesPageContext';
import { ProfilesPageHeader } from './ProfilesPageHeader';
import { ProfilesPageList } from './ProfilesPageList';

interface ProfilesPageClientProps {
  initialQueryParams: ProfilesPageQueryParams;
  ssrAccounts: DTOAccount[];
  ssrTotalPages: number;
}

export function ProfilesPageClient(props: ProfilesPageClientProps) {
  const { initialQueryParams, ssrAccounts, ssrTotalPages } = props;

  return (
    <ProfilesPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrAccounts={ssrAccounts}
      ssrTotalPages={ssrTotalPages}
    >
      <ProfilesPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <ProfilesPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ProfilesPageContextProvider>
  );
}
