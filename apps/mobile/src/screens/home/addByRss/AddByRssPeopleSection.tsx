import { useTranslation } from 'react-i18next';

import type { AboutPerson } from '../../../components/content';
import { PeoplePane } from '../../../components/content';
import type { AddByRssSectionPaneProps } from './addByRssSectionPane';

/**
 * Add by RSS People chip. Cast and Appearances come from the feed stored on this phone.
 */
export function AddByRssPeopleSection({ detail, listHeader }: AddByRssSectionPaneProps) {
  const { t } = useTranslation();
  const appearancePeople: AboutPerson[] = detail.appearances.map((appearance, index) => ({
    href: null,
    id: index + 1,
    img: appearance.img,
    name: appearance.name,
    personIdText: null,
    role: t('info.people.appearance_count', { count: appearance.itemCount }),
  }));

  return (
    <PeoplePane
      appearancePeople={appearancePeople}
      isLoading={false}
      listHeader={listHeader}
      people={detail.people}
      testIDPrefix="add-by-rss-home"
    />
  );
}
