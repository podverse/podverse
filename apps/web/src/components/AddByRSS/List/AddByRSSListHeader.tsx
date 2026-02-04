'use client';

import React from 'react';

import { Button } from '../../Button/Button';
import { ViewSelector } from '../../ViewSelector/ViewSelector';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CommonListPageHeader } from '../../Common/List/CommonListPageHeader';

type AddByRSSListHeaderProps = {
  title: string;
  isUpdating: boolean;
  onCheckUpdates: () => void;
  checkUpdatesLabel: string;
  viewSelected: ViewSelectedOption;
  setViewSelected: (view: ViewSelectedOption) => void;
};

export const AddByRSSListHeader: React.FC<AddByRSSListHeaderProps> = ({
  title,
  isUpdating,
  onCheckUpdates,
  checkUpdatesLabel,
  viewSelected,
  setViewSelected,
}) => {
  const buttonsNode = (
    <>
      <Button onClick={onCheckUpdates} isLoading={isUpdating} variant="outline">
        {checkUpdatesLabel}
      </Button>
      <ViewSelector viewSelected={viewSelected} setViewSelected={setViewSelected} />
    </>
  );

  return <CommonListPageHeader title={title} buttonsNode={buttonsNode} />;
};
