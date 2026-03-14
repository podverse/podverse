'use client';

import { useTranslations } from 'next-intl';

import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { Settings } from '../../components/Settings/Settings';
import { SideContent } from '../../components/SideContent/SideContent';

export function SettingsClient() {
  const tSettings = useTranslations('settings');

  return (
    <>
      <MainHeader title={tSettings('settings')} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <Settings />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
