'use client';

import type { DTOAccount } from '@podverse/helpers';

import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { ProfileHeader } from '../../components/Media/Profile/ProfileHeader';
import { MyProfilePageContentContextProvider } from './MyProfilePageContentContext';
import { MyProfilePageContentList } from './MyProfilePageContentList';
import { MyProfilePageContentListHeader } from './MyProfilePageContentListHeader';

interface MyProfilePageClientProps {
  ssrAccount: DTOAccount;
}

export function MyProfilePageClient(props: MyProfilePageClientProps) {
  const { ssrAccount } = props;

  return (
    <MyProfilePageContentContextProvider account={ssrAccount}>
      <MainWrapper>
        <ProfileHeader account={ssrAccount} isOwnProfile={true} />
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <MyProfilePageContentListHeader />
            <MyProfilePageContentList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </MyProfilePageContentContextProvider>
  );
}
