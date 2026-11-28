'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';
import { localPeopleSectionsFromMappedFeed } from '@podverse/parser-mapping';

import type { ContentPeoplePlainCredit } from '../../Content/About/ContentPeopleRow';
import { ContentPeopleRow } from '../../Content/About/ContentPeopleRow';
import { ContentExpandableRows } from '../../Content/ContentExpandableRows';

import styles from '../../../styles/components/Content/About/ContentPeopleRows.module.scss';

type AddByRSSItemPerson = {
  href?: string | null;
  img?: string | null;
  name: string;
  role?: string | null;
};

const peopleRows = (people: readonly ContentPeoplePlainCredit[]) =>
  people.map((person, index) => (
    <ContentPeopleRow key={`${person.name}-${index}`} plain={person} />
  ));

/** Cast and Appearances for an Add by RSS channel stored on this browser. */
export const AddByRSSChannelPeople = ({
  mappedFeed,
}: {
  mappedFeed: AddByRSSMappedFeed | null | undefined;
}) => {
  const tInfo = useTranslations('info');
  const sections = useMemo(() => localPeopleSectionsFromMappedFeed(mappedFeed), [mappedFeed]);
  const castRows = peopleRows(sections.cast);
  const appearanceRows = peopleRows(
    sections.appearances.map((person) => ({
      appearanceCount: person.itemCount,
      img: person.img,
      name: person.name,
    }))
  );

  if (castRows.length === 0 && appearanceRows.length === 0) {
    return null;
  }

  return (
    <div data-testid="add-by-rss-people">
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

/** People on one Add by RSS episode, track, or livestream. Names stay plain text. */
export const AddByRSSItemPeople = ({ people }: { people: readonly AddByRSSItemPerson[] }) => {
  const rows = peopleRows(
    people.flatMap((person) =>
      person.name.trim() === ''
        ? []
        : [
            {
              href: person.href ?? null,
              img: person.img ?? null,
              name: person.name,
              role: person.role ?? null,
            },
          ]
    )
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <div data-testid="add-by-rss-people">
      <ContentExpandableRows rows={rows} rowsClassName={styles.rows} />
    </div>
  );
};

/** True when at least one credit has a name. */
export const addByRssItemHasPeople = (people: readonly { name: string }[] | undefined): boolean =>
  (people ?? []).some((person) => person.name.trim() !== '');
