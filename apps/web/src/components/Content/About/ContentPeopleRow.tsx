import { useTranslations } from 'next-intl';

import type { DTOChannelPerson, DTOItemPerson, DTOPersonAppearance } from '@podverse/helpers';
import { buildPersonPath } from '@podverse/helpers';

import { Link } from '../../Link/Link';

import styles from '../../../styles/components/Content/About/ContentPeopleRow.module.scss';

/** A credit that stays on the device. It never links to a person page. */
export type ContentPeoplePlainCredit = {
  appearanceCount?: number;
  href?: string | null;
  img?: string | null;
  name: string;
  role?: string | null;
};

type ContentPeopleRowProps = {
  appearance?: DTOPersonAppearance;
  channel_person?: DTOChannelPerson;
  item_person?: DTOItemPerson;
  plain?: ContentPeoplePlainCredit;
};

export const ContentPeopleRow = ({
  appearance,
  channel_person,
  item_person,
  plain,
}: ContentPeopleRowProps) => {
  const tInfo = useTranslations('info');
  const credit = item_person ?? channel_person;
  const name = plain?.name ?? appearance?.display_name ?? credit?.name ?? '';
  const imageUrl = plain?.img ?? appearance?.img ?? credit?.img ?? null;
  const personIdText =
    plain !== undefined ? null : (appearance?.id_text ?? credit?.person_id_text ?? null);
  const website = plain !== undefined ? (plain.href ?? null) : (credit?.href ?? null);
  const role = plain !== undefined ? (plain.role ?? null) : (credit?.role ?? null);
  const appearanceCount =
    plain?.appearanceCount !== undefined
      ? plain.appearanceCount
      : appearance !== undefined
        ? appearance.item_count
        : null;

  if (name === '') {
    return null;
  }

  const nameNode =
    personIdText !== null && personIdText !== '' ? (
      <Link className={styles.name} color="secondary" href={buildPersonPath(personIdText)}>
        {name}
      </Link>
    ) : (
      <div className={styles.name}>{name}</div>
    );

  return (
    <div className={styles.row}>
      {imageUrl !== null && imageUrl !== '' ? (
        <img
          alt={name || tInfo('people.person_image')}
          className={styles.personImage}
          src={imageUrl}
        />
      ) : null}
      <div className={styles.textWrapper}>
        {nameNode}
        {role !== null && role !== '' ? <div className={styles.role}>{role}</div> : null}
        {appearanceCount !== null ? (
          <div className={styles.role}>
            {tInfo('people.appearance_count', { count: appearanceCount })}
          </div>
        ) : null}
        {website !== null && website !== '' ? (
          <Link
            aria-label={tInfo('people.link_to_persons_webpage')}
            className={styles.role}
            color="secondary"
            href={website}
            rel="noopener noreferrer"
            target="_blank"
            title={tInfo('people.website')}
          >
            {tInfo('people.website')}
          </Link>
        ) : null}
      </div>
    </div>
  );
};
