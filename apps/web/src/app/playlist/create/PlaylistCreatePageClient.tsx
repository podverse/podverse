'use client';

import { PlaylistCreatePageContextProvider } from './PlaylistCreatePageContext';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { PlaylistCreatePageHeader } from './PlaylistCreatePageHeader';
import { PlaylistCreatePageForm } from './PlaylistCreatePageForm';

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
