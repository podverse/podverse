'use client';

import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { PlaylistCreatePageContextProvider } from './PlaylistCreatePageContext';
import { PlaylistCreatePageForm } from './PlaylistCreatePageForm';
import { PlaylistCreatePageHeader } from './PlaylistCreatePageHeader';

export function PlaylistCreatePageClient() {
  return (
    <PlaylistCreatePageContextProvider>
      <PlaylistCreatePageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <PlaylistCreatePageForm />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PlaylistCreatePageContextProvider>
  );
}
