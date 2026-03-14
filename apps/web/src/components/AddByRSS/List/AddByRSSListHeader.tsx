'use client';

import React from 'react';

import { Button } from '../../Button/Button';
import { CommonListPageHeader } from '../../Common/List/CommonListPageHeader';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { ViewSelector } from '../../ViewSelector/ViewSelector';

type AddByRSSListHeaderProps = {
  title: string;
  isUpdating: boolean;
  onCheckUpdates: () => void;
  checkUpdatesLabel: string;
  viewSelected: ViewSelectedOption;
  setViewSelected: (view: ViewSelectedOption) => void;
  extraButtons?: React.ReactNode;
};

export const AddByRSSListHeader: React.FC<AddByRSSListHeaderProps> = ({
  title,
  isUpdating,
  onCheckUpdates,
  checkUpdatesLabel,
  viewSelected,
  setViewSelected,
  extraButtons = null,
}) => {
  const buttonsNode = (
    <>
      <Button onClick={onCheckUpdates} isLoading={isUpdating} variant="mini">
        {checkUpdatesLabel}
      </Button>
      {extraButtons}
      <ViewSelector viewSelected={viewSelected} setViewSelected={setViewSelected} />
    </>
  );

  return <CommonListPageHeader title={title} buttonsNode={buttonsNode} />;
};
