'use client';

import React from 'react';

import { ProfileContentChipRow } from '../../components/Media/Profile/ProfileContentChipRow';
import { useMyProfilePageContentContext } from './MyProfilePageContentContext';

export const MyProfilePageContentListHeader: React.FC = () => {
  const { selectedTab, setSelectedTab } = useMyProfilePageContentContext();

  return (
    <ProfileContentChipRow
      onSelect={setSelectedTab}
      selected={selectedTab}
      testId="my-profile-content-chips"
    />
  );
};
