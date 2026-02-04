'use client';

import React from 'react';

import { ListHeader } from '../../List/ListHeader';

type CommonDetailListHeaderProps = {
  tabs: React.ReactNode;
  sideButtons?: React.ReactNode | null;
};

export const CommonDetailListHeader: React.FC<CommonDetailListHeaderProps> = ({
  tabs,
  sideButtons = null,
}) => {
  return <ListHeader tabs={tabs} sideButtons={sideButtons} />;
};
