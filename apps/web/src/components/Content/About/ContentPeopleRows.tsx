import type { DTOChannelPerson, DTOItemPerson } from '@podverse/helpers';

import { ContentExpandableRows } from '../ContentExpandableRows';
import { ContentPeopleRow } from './ContentPeopleRow';

import styles from '../../../styles/components/Content/About/ContentPeopleRows.module.scss';

type ContentPeopleRowsProps = {
  channel_persons?: DTOChannelPerson[];
  item_persons?: DTOItemPerson[];
};

export const ContentPeopleRows = ({ channel_persons, item_persons }: ContentPeopleRowsProps) => {
  const rows =
    item_persons && item_persons.length > 0
      ? item_persons.map((item_person) => {
          return <ContentPeopleRow key={item_person.id} item_person={item_person} />;
        })
      : channel_persons && channel_persons.length > 0
        ? channel_persons.map((channel_person) => {
            return <ContentPeopleRow key={channel_person.id} channel_person={channel_person} />;
          })
        : [];

  return <ContentExpandableRows rows={rows} rowsClassName={styles.rows} />;
};
