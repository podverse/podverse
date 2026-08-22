import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../primitives/Card';
import { ListRow } from '../primitives/ListRow';
import { MobileScreenContainer } from './MobileScreenContainer';
import { useTheme } from '../../theme/useTheme';

export type MenuListItem = {
  onPress: () => void;
  testID: string;
  title: string;
};

export type MenuListScreenProps = {
  items: readonly MenuListItem[];
  secondaryItems?: readonly MenuListItem[];
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
            onPress={item.onPress}
            paddingVertical={tokens.spacing.lg}
            testID={item.testID}
            title={item.title}
            trailing={<Text style={styles.chevron}>›</Text>}
          />
        </View>
      ))}
    </>
  );
}

/**
 * Hub menu (More, My Library, etc.): grouped list rows with chevrons — iOS Settings style. Title
 * comes from the native stack header; omit `MobileScreenContainer` heading.
 */
export function MenuListScreen({ items, secondaryItems, testID }: MenuListScreenProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionSpacing: {
          marginTop: tokens.spacing.base,
        },
      }),
    [tokens]
  );

  return (
    <MobileScreenContainer testID={testID}>
      <Card padded={false}>
        <MenuListGroup items={items} />
      </Card>
      {secondaryItems !== undefined && secondaryItems.length > 0 ? (
        <View style={styles.sectionSpacing}>
          <Card padded={false}>
            <MenuListGroup items={secondaryItems} />
          </Card>
        </View>
      ) : null}
    </MobileScreenContainer>
  );
}
