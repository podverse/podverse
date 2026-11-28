import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOPersonAppearance } from '@podverse/helpers';

import { createMobileApiRequestService } from '../../auth/mobileApi';
import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { FillList } from '../primitives';
import { LoadingSection } from '../state/LoadingSection';
import type { AboutPerson } from './aboutPerson';
import { AboutPersonRow } from './AboutPersonRow';

export type PeoplePaneProps = {
  /**
   * When set, this pane also loads distinct item credits for the channel and lists them under
   * Appearances. Item pages leave it unset and render `people` only.
   */
  appearanceChannelIdText?: string;
  /**
   * Appearances already grouped on the device. When set, the pane lists them and does not
   * request the public channel.
   */
  appearancePeople?: readonly AboutPerson[];
  isLoading?: boolean;
  /** `inline` paints in a parent list footer. `fill` owns the section scroll. */
  layout?: 'fill' | 'inline';
  listHeader?: ReactNode;
  onOpenPerson?: (personIdText: string) => void;
  people: readonly AboutPerson[];
  testIDPrefix: string;
};

type PeopleEntry =
  | { key: string; kind: 'title'; title: string }
  | { key: string; kind: 'person'; person: AboutPerson };

function appearanceRows(
  appearances: readonly DTOPersonAppearance[],
  appearanceCount: (count: number) => string
): AboutPerson[] {
  return appearances.map((appearance, index) => ({
    href: null,
    id: index + 1,
    img: appearance.img,
    name: appearance.display_name,
    personIdText: appearance.id_text,
    role: appearanceCount(appearance.item_count),
  }));
}

/**
 * People chip body. Callers pass the person array that belongs to this channel or item.
 * A public channel passes `appearanceChannelIdText`. An Add by RSS channel passes
 * `appearancePeople` so the list stays on the device.
 */
export function PeoplePane({
  appearanceChannelIdText,
  appearancePeople,
  isLoading = false,
  layout = 'fill',
  listHeader,
  onOpenPerson,
  people,
  testIDPrefix,
}: PeoplePaneProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [appearances, setAppearances] = useState<DTOPersonAppearance[]>([]);
  const hasPrecomputedAppearances = appearancePeople !== undefined;

  useEffect(() => {
    if (hasPrecomputedAppearances) {
      return;
    }
    if (appearanceChannelIdText === undefined || appearanceChannelIdText === '') {
      setAppearances([]);
      return;
    }
    const channelIdText = appearanceChannelIdText;
    let cancelled = false;
    const api = createMobileApiRequestService();
    if (api === null) {
      return;
    }
    void api
      .reqChannelPersonAppearances(channelIdText, { limit: 50, page: 1 })
      .then((page) => {
        if (!cancelled) {
          setAppearances(page.data);
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
  }, [appearanceChannelIdText, hasPrecomputedAppearances]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
        },
        inline: {
          gap: tokens.spacing.xs,
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        sectionTitle: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          paddingTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const resolvedAppearancePeople = useMemo(
    () =>
      appearancePeople !== undefined
        ? [...appearancePeople]
        : appearanceRows(appearances, (count) => t('info.people.appearance_count', { count })),
    [appearancePeople, appearances, t]
  );
  const usesAppearanceSections =
    appearancePeople !== undefined || appearanceChannelIdText !== undefined;

  const sectionEntries = useMemo((): PeopleEntry[] => {
    if (!usesAppearanceSections) {
      return [];
    }
    const entries: PeopleEntry[] = [];
    if (people.length > 0) {
      entries.push({ key: 'cast-title', kind: 'title', title: t('info.people.cast') });
      for (const person of people) {
        entries.push({
          key: `cast-${person.personIdText ?? person.id}`,
          kind: 'person',
          person,
        });
      }
    }
    if (resolvedAppearancePeople.length > 0) {
      entries.push({
        key: 'appearances-title',
        kind: 'title',
        title: t('info.people.appearances'),
      });
      for (const person of resolvedAppearancePeople) {
        entries.push({
          key: `appearance-${person.personIdText ?? person.id}`,
          kind: 'person',
          person,
        });
      }
    }
    return entries;
  }, [people, resolvedAppearancePeople, t, usesAppearanceSections]);

  if (layout === 'inline') {
    if (isLoading && people.length === 0) {
      return <LoadingSection testID={`${testIDPrefix}-people-loading`} />;
    }
    if (people.length === 0) {
      return null;
    }
    return (
      <View style={styles.inline} testID={`${testIDPrefix}-people`}>
        {people.map((person) => (
          <AboutPersonRow
            key={person.id}
            onOpenPerson={onOpenPerson}
            person={person}
            testID={`${testIDPrefix}-person-${person.id}`}
          />
        ))}
      </View>
    );
  }

  if (usesAppearanceSections) {
    const waiting = isLoading && people.length === 0 && resolvedAppearancePeople.length === 0;
    return (
      <FillList
        ListEmptyComponent={
          waiting ? <LoadingSection testID={`${testIDPrefix}-people-loading`} /> : null
        }
        ListHeaderComponent={
          listHeader !== null && listHeader !== undefined ? <>{listHeader}</> : null
        }
        accessibilityLabel={t('info.people.people')}
        contentContainerStyle={styles.content}
        data={sectionEntries}
        keyExtractor={(entry) => entry.key}
        renderItem={({ item }) =>
          item.kind === 'title' ? (
            <Text style={styles.sectionTitle}>{item.title}</Text>
          ) : (
            <AboutPersonRow
              onOpenPerson={onOpenPerson}
              person={item.person}
              testID={`${testIDPrefix}-person-${item.person.personIdText ?? item.person.id}`}
            />
          )
        }
        style={styles.list}
        testID={`${testIDPrefix}-people`}
      />
    );
  }

  return (
    <FillList
      ListEmptyComponent={
        isLoading ? <LoadingSection testID={`${testIDPrefix}-people-loading`} /> : null
      }
      ListHeaderComponent={
        listHeader !== null && listHeader !== undefined ? <>{listHeader}</> : null
      }
      accessibilityLabel={t('info.people.people')}
      contentContainerStyle={styles.content}
      data={isLoading ? [] : [...people]}
      keyExtractor={(person) => String(person.id)}
      renderItem={({ item: person }) => (
        <AboutPersonRow
          onOpenPerson={onOpenPerson}
          person={person}
          testID={`${testIDPrefix}-person-${person.id}`}
        />
      )}
      style={styles.list}
      testID={`${testIDPrefix}-people`}
    />
  );
}
