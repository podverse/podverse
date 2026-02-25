'use client';

import type { DTOClip } from '@podverse/helpers';
import { ClipEditPageContextProvider } from './ClipEditPageContext';
import { ClipEditPageForm } from './ClipEditPageForm';
import { ClipEditPageHeader } from './ClipEditPageHeader';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../../components/Main/MainInnerContentWrapper';

type ClipEditPageClientProps = {
  ssrClip: DTOClip;
  ssrEnclosureTypeSelected: 'default' | 'audio' | 'video';
  ssrEnclosureRowSelected: number;
};

export function ClipEditPageClient({
  ssrClip,
  ssrEnclosureTypeSelected,
  ssrEnclosureRowSelected,
}: ClipEditPageClientProps) {
  return (
    <ClipEditPageContextProvider
      ssrClip={ssrClip}
      ssrEnclosureTypeSelected={ssrEnclosureTypeSelected}
      ssrEnclosureRowSelected={ssrEnclosureRowSelected}
    >
      <ClipEditPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <ClipEditPageForm ssrClip={ssrClip} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ClipEditPageContextProvider>
  );
}
