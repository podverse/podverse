import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { OfflineCause } from '../../prefs/offlineStatus';
import { useOfflineStatus } from '../../prefs/offlineStatus';
import {
  bottomChromeStripContainerLayout,
  bottomChromeStripTextStyle,
} from '../../theme/bottomChromeStrip';
import { useTheme } from '../../theme/useTheme';

/**
 * Slim warning strip above the mini player whenever the app is offline, whether the user asked for
 * that or the network stopped working. Lives in the persistent bottom chrome (with sync progress
 * and the mini player) so it stays fixed across stack pushes and never displaces screen content.
 *
 * This strip is the only announcement a connectivity change gets. No toast, dialog, or
 * notification — on a bad signal those would arrive over and over for something the user already
 * knows and cannot fix. Height and type match the other bottom-chrome strips.
 */

/**
 * One cause, one sentence. An exhaustive switch rather than a lookup with a fallback, so adding a
 * cause is a compile error here instead of a state that silently shows the wrong message.
 */
const messageKeyForCause = (cause: OfflineCause): string => {
  switch (cause) {
    case 'device_offline':
      return 'settings.offline_mode.banner_no_connection';
    case 'forced':
      return 'settings.offline_mode.banner';
    case 'server_unreachable':
      return 'settings.offline_mode.banner_server_unreachable';
  }
};

export function OfflineModeBanner() {
  const { t } = useTranslation();
  const { cause } = useOfflineStatus();
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          backgroundColor: tokens.background.warning,
          borderTopColor: tokens.border.warning,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...bottomChromeStripContainerLayout(tokens.spacing),
        },
        label: {
          ...bottomChromeStripTextStyle(),
          color: tokens.text.warning,
          textAlign: 'center',
        },
      }),
    [tokens]
  );

  if (cause === null) {
    return null;
  }

  const message = t(messageKeyForCause(cause));

  return (
    <View
      accessibilityLabel={message}
      // The strip appears in response to a state change rather than a tap, so it has to be spoken
      // rather than only painted.
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      accessible
      style={styles.container}
      testID="offline-mode-banner"
    >
      <Text
        style={styles.label}
        // A per-cause handle, so a test can tell "the user turned Offline Mode on" apart from "the
        // network went away". Through the shared outer testID the three look identical.
        testID={`offline-mode-banner-${cause}`}
      >
        {message}
      </Text>
    </View>
  );
}
