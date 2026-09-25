import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  completeMobilePasswordLogin,
  completeMobilePasswordLoginMessageKey,
  useAuth,
} from '../../auth';
import { HEADER_BAR_HEIGHT } from '../../components/screen/HeaderBar';
import { getMobileConfig } from '../../config';
import { useTheme } from '../../theme/useTheme';
import { isE2eQuickLoginEnabled } from './e2eQuickLoginGate';
import {
  E2E_PERF_EMAIL,
  E2E_POPULARITY_UNDECIDED_EMAIL,
  E2E_USER_EMAIL,
  E2E_USER_PASSWORD,
} from './e2eSeedConstants';

/**
 * One-tap sign-in for Maestro. Hidden unless Metro is a dev bundle and
 * `EXPO_PUBLIC_MOBILE_E2E=1`.
 *
 * Each target is 44pt and fully opaque. iOS drops touches on a view at or below 0.01 opacity
 * even when that view is still in the accessibility tree, and Maestro still reports the tap as
 * passed. The boxes paint nothing, so screenshots stay clean.
 *
 * The row sits in the header, inset past the back chevron. A column under the header covers
 * the leading play control on list rows, and sharing the chevron's slot makes a back tap
 * sign in again.
 */
const E2E_QUICK_LOGIN_HIT_SIZE = 44;

export function E2eQuickLogin() {
  const enabled = isE2eQuickLoginEnabled({
    isDev: __DEV__,
    isE2e: getMobileConfig().isE2e,
  });
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { clearSession, setAccount, setError: setAuthError, setTokens, status } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    error: {
      backgroundColor: themeStyles.screen.backgroundColor,
      color: themeStyles.textPrimary.color,
      padding: tokens.spacing.md,
    },
    hit: {
      height: E2E_QUICK_LOGIN_HIT_SIZE,
      width: E2E_QUICK_LOGIN_HIT_SIZE,
    },
    host: {
      flexDirection: 'row',
      left: HEADER_BAR_HEIGHT + 12,
      position: 'absolute',
      top: insets.top,
      zIndex: 2000,
    },
    marker: {
      height: E2E_QUICK_LOGIN_HIT_SIZE,
      width: E2E_QUICK_LOGIN_HIT_SIZE,
    },
  });

  if (!enabled) {
    return null;
  }

  const signIn = (email: string) => {
    if (isLoading || status === 'unknown') {
      return;
    }

    setIsLoading(true);
    setError(null);
    void (async () => {
      // Switching accounts goes through sign-out, the same as a person doing it by hand, so
      // account-scoped data is cleared before the next account's tokens exist.
      if (status === 'authenticated') {
        await clearSession('user_logout');
      }
      const result = await completeMobilePasswordLogin({
        clearSession,
        email,
        password: E2E_USER_PASSWORD,
        setAccount,
        setAuthError,
        setTokens,
      });
      if (!result.ok) {
        setError(t(completeMobilePasswordLoginMessageKey(result.error)));
      }
    })()
      .catch(() => {
        setError(t('authentication.could_not_sign_in'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const busy = isLoading || status === 'unknown';

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Pressable
        accessibilityLabel={t('e2e.quick_login')}
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading, disabled: busy }}
        onPress={() => {
          signIn(E2E_USER_EMAIL);
        }}
        style={styles.hit}
        testID="e2e-quick-login"
      />
      <Pressable
        accessibilityLabel={t('e2e.quick_login_popularity')}
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading, disabled: busy }}
        onPress={() => {
          signIn(E2E_POPULARITY_UNDECIDED_EMAIL);
        }}
        style={styles.hit}
        testID="e2e-quick-login-popularity"
      />
      <Pressable
        accessibilityLabel={t('e2e.quick_login_perf')}
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading, disabled: busy }}
        onPress={() => {
          signIn(E2E_PERF_EMAIL);
        }}
        style={styles.hit}
        testID="e2e-quick-login-perf"
      />
      {status === 'authenticated' ? (
        <View
          accessibilityLabel={t('e2e.session_ready')}
          accessible
          collapsable={false}
          style={styles.marker}
          testID="e2e-session-authenticated"
        />
      ) : null}
      {error !== null ? (
        <Text style={styles.error} testID="e2e-quick-login-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
