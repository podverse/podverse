import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../primitives/Card';
import { ListRow } from '../primitives/ListRow';
import { MobileScreenContainer } from './MobileScreenContainer';

export type MenuListItem = {
  accessibilityLabel?: string;
  onPress: () => void;
  showsChevron?: boolean;
  subtitle?: string;
  /** Count shown left of the chevron. Hidden at 0. */
  badgeCount?: number;
  testID: string;
  title: string;
};

export type MenuListSection = {
  items: readonly MenuListItem[];
  key: string;
  title?: string;
  /**
   * Optional content rendered at the top of the section Card (e.g. Offline Mode switch). When
   * present with nav rows, a hairline separates the header from the first row.
   */
  header?: ReactNode;
};

export type MenuListScreenProps = {
  sections: readonly MenuListSection[];
  testID: string;
};

function MenuListGroup({ items }: { items: readonly MenuListItem[] }) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chevron: {
          color: themeStyles.textSecondary.color,
          fontSize: 18,
        },
        row: {
          paddingHorizontal: tokens.spacing.lg,
        },
        rowDivider: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <>
      {items.map((item, index) => (
        <View key={item.testID} style={[styles.row, index > 0 ? styles.rowDivider : null]}>
          <ListRow
            accessibilityLabel={item.accessibilityLabel}
            badgeCount={item.badgeCount}
            onPress={item.onPress}
            paddingVertical={tokens.spacing.lg}
            subtitle={item.subtitle}
            testID={item.testID}
            title={item.title}
            trailing={
              item.showsChevron === false ? undefined : <Text style={styles.chevron}>›</Text>
            }
          />
        </View>
      ))}
    </>
  );
}

/**
 * Hub menu (More, My Library, Browse): optional section titles above grouped cards, chevrons on
 * rows that push a screen. Callers pass already-localized titles. Omit a chevron for in-place
 * actions (Log out).
 */
export function MenuListScreen({ sections, testID }: MenuListScreenProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const visibleSections = sections.filter(
    (section) => section.items.length > 0 || section.header !== undefined
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerDivider: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        section: {
          gap: tokens.spacing.lg,
        },
        sectionSpaced: {
          marginTop: tokens.spacing.xl,
        },
        sectionTitle: {
          ...typography.heading,
          color: tokens.text.accent,
          fontWeight: '700',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID={testID}>
      {visibleSections.map((section, index) => (
        <View key={section.key} style={[styles.section, index > 0 ? styles.sectionSpaced : null]}>
          {section.title !== undefined ? (
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </Text>
          ) : null}
          <Card padded={false}>
            {section.header !== undefined ? (
              <View style={section.items.length > 0 ? styles.headerDivider : undefined}>
                {section.header}
              </View>
            ) : null}
            {section.items.length > 0 ? <MenuListGroup items={section.items} /> : null}
          </Card>
        </View>
      ))}
    </MobileScreenContainer>
  );
}
