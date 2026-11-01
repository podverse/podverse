'use client';

import React from 'react';

import { ProfileContentChipRow } from '../../../components/Media/Profile/ProfileContentChipRow';
import { useProfilePageContentContext } from './ProfilePageContentContext';

export const ProfilePageContentListHeader: React.FC = () => {
  const { selectedTab, setSelectedTab } = useProfilePageContentContext();

  return (
    <ProfileContentChipRow
      onSelect={setSelectedTab}
      selected={selectedTab}
      testId="profile-content-chips"
    />
  );
};
