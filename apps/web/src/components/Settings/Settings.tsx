'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Tabs } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { ListHeader } from '../List/ListHeader';
import { SettingsAccount } from './Panels/SettingsAccount/SettingsAccount';
import { SettingsGeneral } from './Panels/SettingsGeneral/SettingsGeneral';
import { SettingsKeyboard } from './Panels/SettingsKeyboard/SettingsKeyboard';
import { SettingsNotifications } from './Panels/SettingsNotifications/SettingsNotifications';
import { SettingsOpml } from './Panels/SettingsOpml/SettingsOpml';
import { SettingsProfile } from './Panels/SettingsProfile/SettingsProfile';
import { SettingsWrapper } from './SettingsWrapper';

type TabKey = 'account' | 'general' | 'keyboard' | 'notifications' | 'opml' | 'profile';

function tabFromQueryParam(value: string | null): TabKey | null {
  if (value === 'account' || value === 'profile' || value === 'notifications' || value === 'opml')
    return value;
  if (value === 'general') return 'general';
  if (value === 'keyboard') return 'keyboard';
  return null;
}

export function Settings() {
  const tSettings = useTranslations('settings');
  const tContact = useTranslations('contact');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loggedInAccount } = useAccount();

  const tabParam = searchParams.get('tab');
  const tabFromQuery = tabFromQueryParam(tabParam);

  const [tab, setTab] = React.useState<TabKey>(() => {
    const initialFromUrl = tabFromQueryParam(searchParams.get('tab'));
    if (!loggedInAccount) {
      if (initialFromUrl === 'keyboard' || initialFromUrl === 'general') {
        return initialFromUrl ?? 'general';
      }
      return 'general';
    }
    return initialFromUrl ?? 'general';
  });

  // Sync tab from URL when URL changes (e.g. back/forward or direct link)
  React.useEffect(() => {
    const urlTab = tabFromQueryParam(tabParam);
    if (urlTab !== null) {
      setTab(urlTab);
    }
  }, [tabParam]);

  // Redirect non-logged-in users away from restricted tabs
  React.useEffect(() => {
    if (loggedInAccount) return;
    if (tabFromQuery === null || tabFromQuery === 'general' || tabFromQuery === 'keyboard') return;
    setTab('general');
    router.replace('/settings');
  }, [loggedInAccount, tabFromQuery, router]);

  const handleTabChange = React.useCallback(
    (newTab: TabKey) => {
      setTab(newTab);
      const path = newTab === 'general' ? '/settings' : `/settings?tab=${newTab}`;
      router.replace(path);
    },
    [router]
  );

  const tabData = React.useMemo(() => {
    let z = 10;
    const rows: {
      key: TabKey;
      label: string;
      onClick: () => void;
      zIndex: number;
    }[] = [
      {
        key: 'general',
        label: tContact('general'),
        onClick: () => handleTabChange('general'),
        zIndex: z,
      },
    ];
    z -= 1;
    if (loggedInAccount) {
      rows.push({
        key: 'account',
        label: tSettings('account.account'),
        onClick: () => handleTabChange('account'),
        zIndex: z,
      });
      z -= 1;
      rows.push({
        key: 'profile',
        label: tSettings('profile.profile'),
        onClick: () => handleTabChange('profile'),
        zIndex: z,
      });
      z -= 1;
      rows.push({
        key: 'notifications',
        label: tSettings('notifications.notifications'),
        onClick: () => handleTabChange('notifications'),
        zIndex: z,
      });
      z -= 1;
      rows.push({
        key: 'opml',
        label: tSettings('opml.opml'),
        onClick: () => handleTabChange('opml'),
        zIndex: z,
      });
      z -= 1;
    }
    rows.push({
      key: 'keyboard',
      label: tSettings('keyboard.keyboard'),
      onClick: () => handleTabChange('keyboard'),
      zIndex: z,
    });
    return rows;
  }, [handleTabChange, loggedInAccount, tContact, tSettings]);

  return (
    <div>
      <ListHeader tabs={<Tabs tabData={tabData} selectedKey={tab} />} />
      <SettingsWrapper>
        {tab === 'general' && <SettingsGeneral />}
        {tab === 'keyboard' ? <SettingsKeyboard /> : null}
        {loggedInAccount && tab === 'account' && <SettingsAccount />}
        {loggedInAccount && tab === 'profile' && <SettingsProfile />}
        {loggedInAccount && tab === 'notifications' && <SettingsNotifications />}
        {loggedInAccount && tab === 'opml' && <SettingsOpml />}
      </SettingsWrapper>
    </div>
  );
}
