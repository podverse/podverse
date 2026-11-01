import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { HEADER_BAR_HEIGHT, HeaderBar, headerBarTypography } from './HeaderBar';
import type { HeaderBarActionProps } from './HeaderBarAction';
import { HeaderBarAction } from './HeaderBarAction';

export type HeaderBarChromeProps = {
  backAccessibilityLabel?: string;
  backIcon?: HeaderBarActionProps['icon'];
  backTestID?: string;
  /** Forwarded to {@link HeaderBar}. */
  includeStatusInset?: boolean;
  onBack?: () => void;
  /** Leading slot when there is no back control. Tab roots use it for search. */
  left?: ReactNode;
  right?: ReactNode;
  testID?: string;
  title?: string;
};

/**
 * Shared title row: optional back, optional centered title, optional trailing action. Stack
 * headers and full-screen overlays (image viewer, login/signup, full player) use this instead of
 * each inventing a right-slot Pressable. Omit `title` when the leading/trailing actions are the
 * whole bar. Pass `backIcon` when the leading control is not a back chevron.
 */
export function HeaderBarChrome({
  backAccessibilityLabel,
  backIcon = 'chevron-back',
  backTestID = 'stack-header-back',
  includeStatusInset = true,
  left,
  onBack,
  right,
  testID,
  title,
}: HeaderBarChromeProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const [gutter, setGutter] = useState(0);

  const rememberSideWidth = (width: number) => {
    setGutter((current) => (width > current ? width : current));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        leading: {
          alignItems: 'center',
          bottom: 0,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          left: 0,
          position: 'absolute',
          top: 0,
          zIndex: 1,
        },
        row: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          height: HEADER_BAR_HEIGHT,
        },
        title: {
          ...headerBarTypography,
          color: themeStyles.textPrimary.color,
          paddingHorizontal: tokens.spacing.sm,
          textAlign: 'center',
        },
        titleWrap: {
          flex: 1,
          justifyContent: 'center',
          marginHorizontal: gutter,
        },
        trailing: {
          alignItems: 'center',
          bottom: 0,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          position: 'absolute',
          right: 0,
          top: 0,
          zIndex: 1,
        },
      }),
    [gutter, themeStyles, tokens]
  );

  return (
    <HeaderBar includeStatusInset={includeStatusInset} testID={testID}>
      <View style={styles.row}>
        <View
          onLayout={(event) => {
            rememberSideWidth(event.nativeEvent.layout.width);
          }}
          style={styles.leading}
        >
          {onBack !== undefined ? (
            <HeaderBarAction
              accessibilityLabel={backAccessibilityLabel ?? title ?? ''}
              icon={backIcon}
              iconSize={28}
              onPress={onBack}
              testID={backTestID}
            />
          ) : (
            left
          )}
        </View>
        {title !== undefined && title.length > 0 ? (
          <View style={styles.titleWrap}>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          </View>
        ) : null}
        <View
          onLayout={(event) => {
            rememberSideWidth(event.nativeEvent.layout.width);
          }}
          style={styles.trailing}
        >
          {right}
        </View>
      </View>
    </HeaderBar>
  );
}
