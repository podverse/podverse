import type { DTOChannelPerson, DTOItemPerson } from '@podverse/helpers';
import { Accordion } from '@podverse/ui';

import { ContentAboutDescription } from './ContentAboutDescription';
import { ContentAboutHeader } from './ContentAboutHeader';
import { ContentPeopleRows } from './ContentPeopleRows';

import styles from '../../../styles/components/Content/About/ContentAboutAccordion.module.scss';

type ContentAboutAccordionProps = {
  defaultOpen?: boolean;
  description?: string;
  channel_persons?: DTOChannelPerson[];
  item_persons?: DTOItemPerson[];
};

export const ContentAboutAccordion = ({
  defaultOpen,
  description,
  channel_persons,
  item_persons,
}: ContentAboutAccordionProps) => {
  return (
    <Accordion header={<ContentAboutHeader />} open={defaultOpen} contentClassName={styles.content}>
      <div className={styles.wrapper}>
        <ContentAboutDescription description={description} />
        <ContentPeopleRows channel_persons={channel_persons} item_persons={item_persons} />
      </div>
    </Accordion>
  );
};
