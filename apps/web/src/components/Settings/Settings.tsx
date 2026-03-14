'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useAccount } from '../../contexts/Account';
import { ListHeader } from '../List/ListHeader';
import { Tabs } from '../Tabs/Tabs';
import { SettingsAccount } from './Panels/SettingsAccount/SettingsAccount';
import { SettingsGeneral } from './Panels/SettingsGeneral/SettingsGeneral';
import { SettingsNotifications } from './Panels/SettingsNotifications/SettingsNotifications';
import { SettingsProfile } from './Panels/SettingsProfile/SettingsProfile';
import { SettingsWrapper } from './SettingsWrapper';

type TabKey = 'account' | 'general' | 'notifications' | 'profile';

function tabFromQueryParam(value: string | null): TabKey | null {
  if (value === 'account' || value === 'profile' || value === 'notifications') return value;
  if (value === 'general') return 'general';
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
    if (!loggedInAccount) return 'general';
    return tabFromQuery ?? 'general';
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
    if (tabFromQuery === null || tabFromQuery === 'general') return;
    setTab('general');
    router.replace('/settings');
  }, [loggedInAccount, tabFromQuery, router]);

  const handleTabChange = (newTab: TabKey) => {
    setTab(newTab);
    const path = newTab === 'general' ? '/settings' : `/settings?tab=${newTab}`;
    router.replace(path);
  };

  const allTabs = [
    {
      key: 'general' as const,
      label: tContact('general'),
      onClick: () => handleTabChange('general'),
      zIndex: 10,
    },
    {
      key: 'account' as const,
      label: tSettings('account.account'),
      onClick: () => handleTabChange('account'),
      zIndex: 9,
    },
    {
      key: 'profile' as const,
      label: tSettings('profile.profile'),
      onClick: () => handleTabChange('profile'),
      zIndex: 8,
    },
    {
      key: 'notifications' as const,
      label: tSettings('notifications.notifications'),
      onClick: () => handleTabChange('notifications'),
      zIndex: 7,
    },
  ];

  const tabData = loggedInAccount ? allTabs : allTabs[0] ? [allTabs[0]] : [];

  return (
    <div>
      <ListHeader tabs={<Tabs tabData={tabData} selectedKey={tab} />} />
      <SettingsWrapper>
        {tab === 'general' && <SettingsGeneral />}
        {loggedInAccount && tab === 'account' && <SettingsAccount />}
        {loggedInAccount && tab === 'profile' && <SettingsProfile />}
        {loggedInAccount && tab === 'notifications' && <SettingsNotifications />}
      </SettingsWrapper>
    </div>
  );
}
