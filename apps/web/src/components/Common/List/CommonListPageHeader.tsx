'use client';

import React from 'react';

import { MainHeader } from '../../Main/MainHeader';

type CommonListPageHeaderProps = {
  title: string;
  buttonsNode?: React.ReactNode;
};

export const CommonListPageHeader: React.FC<CommonListPageHeaderProps> = ({
  title,
  buttonsNode,
}) => {
  return <MainHeader title={title} buttonsNode={buttonsNode} />;
};
