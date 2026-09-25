import type { DTOChannelPerson, DTOItemPerson } from '@podverse/helpers';

import { ContentAboutAccordion } from './ContentAboutAccordion';
import { ContentAboutDescription } from './ContentAboutDescription';
import { ContentPeopleRows } from './ContentPeopleRows';

import styles from '../../../styles/components/Content/About/ContentAbout.module.scss';

type ContentAbout = {
  description?: string;
  channel_persons?: DTOChannelPerson[];
  item_persons?: DTOItemPerson[];
  defaultOpen?: boolean;
  isAccordion?: boolean;
};

/**
 * Channel About (and optionally item people when a caller passes them): description plus people.
 * People still render when description prose is empty.
 */
export const ContentAbout = ({
  description,
  channel_persons,
  item_persons,
  defaultOpen,
  isAccordion,
}: ContentAbout) => {
  const hasDescription = description !== undefined && description.length > 0;
  const hasPeople = (channel_persons?.length ?? 0) > 0 || (item_persons?.length ?? 0) > 0;

  if (!hasDescription && !hasPeople) {
    return null;
  }

  if (isAccordion) {
    return (
      <ContentAboutAccordion
        description={description}
        channel_persons={channel_persons}
        item_persons={item_persons}
        defaultOpen={defaultOpen}
      />
    );
  }

  return (
    <div className={styles.listView}>
      {hasDescription ? <ContentAboutDescription description={description} /> : null}
      <ContentPeopleRows channel_persons={channel_persons} item_persons={item_persons} />
    </div>
  );
};
