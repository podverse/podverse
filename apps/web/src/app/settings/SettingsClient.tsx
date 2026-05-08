'use client';

import { useTranslations } from 'next-intl';

import { MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { Settings } from '../../components/Settings/Settings';

export function SettingsClient() {
  const tSettings = useTranslations('settings');

  return (
    <>
      <MainHeader title={tSettings('settings')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <Settings />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
