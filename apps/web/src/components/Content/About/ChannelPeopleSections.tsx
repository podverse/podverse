'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOChannelPerson, DTOPersonAppearance } from '@podverse/helpers';

import { getApiRequestService } from '../../../factories/apiRequestService';
import { ContentExpandableRows } from '../ContentExpandableRows';
import { ContentPeopleRow } from './ContentPeopleRow';

import styles from '../../../styles/components/Content/About/ContentPeopleRows.module.scss';

type ChannelPeopleSectionsProps = {
  channelIdText: string;
  channelPersons: DTOChannelPerson[];
};

export const ChannelPeopleSections = ({
  channelIdText,
  channelPersons,
}: ChannelPeopleSectionsProps) => {
  const tInfo = useTranslations('info');
  const [appearances, setAppearances] = useState<DTOPersonAppearance[]>([]);

  useEffect(() => {
    let cancelled = false;
    getApiRequestService()
      .reqChannelPersonAppearances(channelIdText, { limit: 50, page: 1 })
      .then((response) => {
        if (!cancelled) {
          setAppearances(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppearances([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channelIdText]);

  const castRows = channelPersons.map((channelPerson) => (
    <ContentPeopleRow channel_person={channelPerson} key={channelPerson.id} />
  ));
  const appearanceRows = appearances.map((appearance) => (
    <ContentPeopleRow appearance={appearance} key={appearance.id_text} />
  ));

  return (
    <div>
      {castRows.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>{tInfo('people.cast')}</h2>
          <ContentExpandableRows rows={castRows} rowsClassName={styles.rows} />
        </section>
      ) : null}
      {appearanceRows.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>{tInfo('people.appearances')}</h2>
          <ContentExpandableRows rows={appearanceRows} rowsClassName={styles.rows} />
        </section>
      ) : null}
    </div>
  );
};
