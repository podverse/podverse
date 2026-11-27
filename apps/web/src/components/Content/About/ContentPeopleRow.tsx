import { useTranslations } from 'next-intl';

import type { DTOChannelPerson, DTOItemPerson, DTOPersonAppearance } from '@podverse/helpers';
import { buildPersonPath } from '@podverse/helpers';

import { Link } from '../../Link/Link';

import styles from '../../../styles/components/Content/About/ContentPeopleRow.module.scss';

type ContentPeopleRowProps = {
  appearance?: DTOPersonAppearance;
  channel_person?: DTOChannelPerson;
  item_person?: DTOItemPerson;
};

export const ContentPeopleRow = ({
  appearance,
  channel_person,
  item_person,
}: ContentPeopleRowProps) => {
  const tInfo = useTranslations('info');
  const credit = item_person ?? channel_person;
  const name = appearance?.display_name ?? credit?.name ?? '';
  const imageUrl = appearance?.img ?? credit?.img ?? null;
  const personIdText = appearance?.id_text ?? credit?.person_id_text ?? null;
  const website = credit?.href ?? null;
  const role = credit?.role ?? null;

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
        {appearance !== undefined ? (
          <div className={styles.role}>
            {tInfo('people.appearance_count', { count: appearance.item_count })}
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
