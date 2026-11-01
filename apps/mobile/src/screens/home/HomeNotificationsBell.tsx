import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { CountBadge } from '../../components/primitives/CountBadge';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { useNotificationsUnreadCount } from '../../hooks/useNotificationsUnreadCount';
import { resolveNotificationsBellPress } from '../../lib/notifications/notificationsBellPress';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import { navigateToNotificationsInboxScreen } from '../../navigation';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

const createStyles = (_theme: ThemedStylesTheme) =>
  StyleSheet.create({
    badge: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    root: {
      position: 'relative',
    },
  });

/**
 * Home title-bar bell. The unread count is read here so a count change re-renders only this
 * control. The badge face stops at 99+ and the accessible name uses the real count.
 */
export function HomeNotificationsBell() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { openGate } = useMembershipGate();
  const unreadCount = useNotificationsUnreadCount();
  const styles = useThemedStyles(createStyles);

  const notificationsLabel = t('settings.notifications.notifications');
  const accessibilityLabel =
    unreadCount > 0
      ? `${notificationsLabel}, ${t('settings.notifications.unread_count_aria', {
          count: unreadCount,
        })}`
      : notificationsLabel;

  const handlePress = () => {
    const result = resolveNotificationsBellPress({
      access: evaluateFeature('notifications'),
      isTierKnown,
      status,
    });
    if (result.kind === 'open') {
      navigateToNotificationsInboxScreen();
      return;
    }
    openGate(result.reason);
  };

  return (
    <View style={styles.root}>
      <HeaderBarAction
        accessibilityLabel={accessibilityLabel}
        icon="notifications"
        onPress={handlePress}
        testID="home-notifications-bell"
      />
      <View pointerEvents="none" style={styles.badge}>
        <CountBadge count={unreadCount} max={99} testID="home-notifications-bell-badge" />
      </View>
    </View>
  );
}
