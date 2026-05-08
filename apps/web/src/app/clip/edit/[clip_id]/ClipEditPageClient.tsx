'use client';

import type { DTOClip } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { ClipEditPageContextProvider } from './ClipEditPageContext';
import { ClipEditPageForm } from './ClipEditPageForm';
import { ClipEditPageHeader } from './ClipEditPageHeader';

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
        <MainSidebarLayout>
          <MainColumnStack>
            <ClipEditPageForm ssrClip={ssrClip} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ClipEditPageContextProvider>
  );
}
