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
import { LIST_ROW_ACTION_SIZE } from '../../theme/screenLayout';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Glyph edge inside the 44pt hit target. The badge anchors to this square, not the hit target. */
const NOTIFICATION_BELL_GLYPH_SIZE = 26;

/**
 * Distance from the hit target's top and trailing edges to the glyph's. The badge's top and
 * trailing edges start there, then shift by half the badge so its center is the glyph corner.
 */
const GLYPH_INSET = (LIST_ROW_ACTION_SIZE - NOTIFICATION_BELL_GLYPH_SIZE) / 2;

const createStyles = (_theme: ThemedStylesTheme) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      position: 'absolute',
      right: GLYPH_INSET,
      top: GLYPH_INSET,
      // Percentage of the badge itself, so a wider count stays centered on the same corner.
      transform: [{ translateX: '50%' }, { translateY: '-50%' }],
    },
    root: {
      position: 'relative',
    },
  });

/**
 * Home title-bar bell. The unread count is read here so a count change re-renders only this
 * control. The badge face stops at 99+ and the accessible name uses the real count.
 *
 * The count's center is the glyph's top-trailing corner, the same place as the web navbar bell.
 * A one-digit face is a circle and overlaps only that corner, so the bell stays visible.
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
        iconSize={NOTIFICATION_BELL_GLYPH_SIZE}
        onPress={handlePress}
        testID="home-notifications-bell"
      />
      <CountBadge
        count={unreadCount}
        max={99}
        style={styles.badge}
        testID="home-notifications-bell-badge"
      />
    </View>
  );
}
