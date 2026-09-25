'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { DTOItemPerson } from '@podverse/helpers';

import { ContentPeopleRows } from '../../../Content/About/ContentPeopleRows';

const DescriptionRenderer = dynamic(
  () =>
    import('@podverse/ui').then((mod) => ({
      default: mod.DescriptionRenderer,
    })),
  { loading: () => <div /> }
);

type CoreEpisodeSummaryProps = {
  description?: string;
  item_persons?: DTOItemPerson[];
};

/**
 * Item Summary: description prose plus people credited on the item when present.
 * Does not fall back to channel people.
 */
export const CoreEpisodeSummary: React.FC<CoreEpisodeSummaryProps> = ({
  description,
  item_persons,
}) => {
  const hasDescription = description !== undefined && description.length > 0;
  const hasPeople = (item_persons?.length ?? 0) > 0;

  if (!hasDescription && !hasPeople) {
    return null;
  }

  return (
    <div>
      {hasDescription ? <DescriptionRenderer description={description || ''} /> : null}
      {hasPeople ? <ContentPeopleRows item_persons={item_persons} /> : null}
    </div>
  );
};
