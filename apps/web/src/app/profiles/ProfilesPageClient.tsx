'use client';

import type { DTOAccount } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import type { MediaListChipsConfig } from '../../components/MediaListChips/MediaListChips';
import { ProfilesPageChipRow } from './ProfilesPageChipRow';
import type { ProfilesPageQueryParams } from './ProfilesPageContext';
import { ProfilesPageContextProvider } from './ProfilesPageContext';
import { ProfilesPageHeader } from './ProfilesPageHeader';
import { ProfilesPageList } from './ProfilesPageList';

interface ProfilesPageClientProps {
  chipsConfig?: MediaListChipsConfig;
  initialQueryParams: ProfilesPageQueryParams;
  listScope?: 'page' | 'browse';
  ssrAccounts: DTOAccount[];
  ssrTotalPages: number;
}

export type ProfilesListProps = Omit<ProfilesPageClientProps, 'chipsConfig'>;

export function ProfilesPageClient(props: ProfilesPageClientProps) {
  const { chipsConfig, initialQueryParams, listScope = 'page', ssrAccounts, ssrTotalPages } = props;

  return (
    <ProfilesPageContextProvider
      initialQueryParams={initialQueryParams}
      listScope={listScope}
      ssrAccounts={ssrAccounts}
      ssrTotalPages={ssrTotalPages}
    >
      <ProfilesPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <ProfilesPageChipRow chipsConfig={chipsConfig} />
            <ProfilesPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ProfilesPageContextProvider>
  );
}
