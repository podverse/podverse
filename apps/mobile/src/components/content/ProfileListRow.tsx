import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOAccount } from '@podverse/helpers';

import { profileBio, profileDisplayName } from '../../lib/rows/catalogRowCopy';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ListRow } from '../primitives/ListRow';

export type ProfileListRowProps = {
  account: DTOAccount;
  isLast: boolean;
  onPress?: () => void;
  testID?: string;
};

const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) => ({
  row: {
    borderBottomColor: themeStyles.border.borderColor,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
});

/**
 * Text-only profile catalog row. Matches web `ListProfileRow`: display name and an optional bio.
 * Account profiles have no avatar.
 */
export const ProfileListRow = memo(function ProfileListRow({
  account,
  isLast,
  onPress,
  testID,
}: ProfileListRowProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const bio = profileBio(account);

  return (
    <View style={[styles.row, isLast ? styles.rowLast : null]}>
      <ListRow
        onPress={onPress}
        subtitle={bio ?? undefined}
        subtitleNumberOfLines={2}
        subtitleTestID={bio !== null && testID !== undefined ? `${testID}-bio` : undefined}
        testID={testID}
        title={profileDisplayName(account, t)}
      />
    </View>
  );
});
