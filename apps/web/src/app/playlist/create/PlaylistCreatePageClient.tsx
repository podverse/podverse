'use client';

import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { PlaylistCreatePageContextProvider } from './PlaylistCreatePageContext';
import { PlaylistCreatePageForm } from './PlaylistCreatePageForm';
import { PlaylistCreatePageHeader } from './PlaylistCreatePageHeader';

export function PlaylistCreatePageClient() {
  return (
    <PlaylistCreatePageContextProvider>
      <PlaylistCreatePageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <PlaylistCreatePageForm />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </PlaylistCreatePageContextProvider>
  );
}
