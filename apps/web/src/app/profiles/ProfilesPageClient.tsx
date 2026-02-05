'use client';

import type { DTOAccount } from '@podverse/helpers';
import type { ProfilesPageQueryParams } from './ProfilesPageContext';
import { ProfilesPageContextProvider } from './ProfilesPageContext';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { ProfilesPageHeader } from './ProfilesPageHeader';
import { ProfilesPageList } from './ProfilesPageList';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../components/SideContent/SideContent';

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
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <ProfilesPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ProfilesPageContextProvider>
  );
}
