import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { FormActions } from '../../components/form';
import { Card } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { LoadingSection } from '../../components/state/LoadingSection';
import { getMobileConfig } from '../../config';
import { formActionsTopGap, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import {
  AlbyProviderError,
  connectAlby,
  disconnectAlby,
  getAlbyAccountSnapshot,
  isAlbyConfigured,
  loadAlbyConnection,
  refreshAlbyAccount,
  subscribeAlbyConnection,
} from '../../v4v/alby';

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    actions: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
    error: {
      ...typography.body,
      color: tokens.text.danger,
    },
    label: {
      ...typography.subheading,
      color: themeStyles.textPrimary.color,
    },
    sentence: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
    stack: {
      gap: settingsCardInnerGap(tokens.spacing),
    },
    value: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
  });

const noteRefreshFailure = (
  error: unknown,
  onRefreshFailed: () => void,
  onSessionEnded: () => void
): void => {
  if (error instanceof AlbyProviderError && error.kind === 'session_ended') {
    onSessionEnded();
    return;
  }
  if (error instanceof AlbyProviderError && error.kind === 'not_configured') {
    return;
  }
  onRefreshFailed();
};

export function AlbyProviderScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const v4vEnabled = getMobileConfig().isV4vEnabled;
  const account = useSyncExternalStore(subscribeAlbyConnection, getAlbyAccountSnapshot);
  const [isLoading, setIsLoading] = useState(v4vEnabled);
  const [connectFailed, setConnectFailed] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectVisible, setDisconnectVisible] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [sessionEndedVisible, setSessionEndedVisible] = useState(false);
  const connectInFlight = useRef(false);
  const disconnectInFlight = useRef(false);

  useEffect(() => {
    if (!v4vEnabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await loadAlbyConnection();
        if (cancelled || getAlbyAccountSnapshot() === null) {
          return;
        }
        try {
          await refreshAlbyAccount();
        } catch (error) {
          if (cancelled) {
            return;
          }
          noteRefreshFailure(
            error,
            () => {
              setRefreshFailed(true);
            },
            () => {
              setSessionEndedVisible(true);
            }
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [v4vEnabled]);

  const onConnect = () => {
    if (connectInFlight.current) {
      return;
    }
    connectInFlight.current = true;
    setIsConnecting(true);
    void connectAlby()
      .then((result) => {
        if (result.status === 'failed') {
          setConnectFailed(true);
          return;
        }
        if (result.status === 'cancelled') {
          return;
        }
        setConnectFailed(false);
      })
      .catch(() => {
        setConnectFailed(true);
      })
      .finally(() => {
        connectInFlight.current = false;
        setIsConnecting(false);
      });
  };

  const onConfirmDisconnect = () => {
    if (disconnectInFlight.current) {
      return;
    }
    disconnectInFlight.current = true;
    setIsDisconnecting(true);
    void disconnectAlby()
      .then(() => {
        setRefreshFailed(false);
      })
      .catch(() => {
        if (getAlbyAccountSnapshot() !== null) {
          setRefreshFailed(true);
        }
      })
      .finally(() => {
        disconnectInFlight.current = false;
        setIsDisconnecting(false);
        setDisconnectVisible(false);
      });
  };

  const dialogs = (
    <>
      <ConfirmDialog
        body={t('v4v.alby.disconnect_body')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="value-provider-alby-disconnect-cancel"
        confirmLabel={t('v4v.alby.disconnect')}
        confirmLoading={isDisconnecting}
        confirmTestID="value-provider-alby-disconnect-confirm"
        confirmVariant="danger"
        onCancel={() => {
          setDisconnectVisible(false);
        }}
        onConfirm={onConfirmDisconnect}
        testID="value-provider-alby-disconnect-dialog"
        title={t('v4v.alby.disconnect_title')}
        visible={disconnectVisible}
      />
      <ConfirmDialog
        body={t('v4v.alby.session_ended_body')}
        cancelLabel={t('misc.ok')}
        cancelTestID="value-provider-alby-session-ended-ok"
        onCancel={() => {
          setSessionEndedVisible(false);
        }}
        testID="value-provider-alby-session-ended"
        title={t('v4v.alby.session_ended_title')}
        visible={sessionEndedVisible}
      />
    </>
  );

  if (!v4vEnabled) {
    return (
      <MobileScreenContainer testID="value-provider-alby-screen">
        <Text style={styles.sentence} testID="value-provider-alby-unavailable">
          {t('v4v.alby.unavailable')}
        </Text>
      </MobileScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <MobileScreenContainer testID="value-provider-alby-screen">
        <LoadingSection />
      </MobileScreenContainer>
    );
  }

  if (!isAlbyConfigured()) {
    return (
      <MobileScreenContainer testID="value-provider-alby-screen">
        <Text style={styles.sentence} testID="value-provider-alby-not-configured">
          {t('v4v.alby.not_configured')}
        </Text>
        {dialogs}
      </MobileScreenContainer>
    );
  }

  if (account === null || sessionEndedVisible) {
    return (
      <MobileScreenContainer testID="value-provider-alby-screen">
        {connectFailed ? (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.error}
            testID="value-provider-alby-error"
          >
            {t('v4v.alby.connect_failed')}
          </Text>
        ) : null}
        <FormActions
          actions={[
            {
              label: t('v4v.alby.connect'),
              loading: isConnecting,
              onPress: onConnect,
              testID: 'value-provider-alby-connect',
            },
          ]}
          style={styles.actions}
        />
        {dialogs}
      </MobileScreenContainer>
    );
  }

  const lightningAddress =
    account.lightningAddress === null
      ? t('v4v.alby.no_lightning_address')
      : account.lightningAddress;
  const balance =
    account.balanceSats === null
      ? t('v4v.alby.balance_unavailable')
      : t('v4v.alby.balance_sats', { count: account.balanceSats });

  return (
    <MobileScreenContainer testID="value-provider-alby-screen">
      <Card>
        <View style={styles.stack}>
          <Text style={styles.label}>{t('v4v.alby.lightning_address')}</Text>
          <Text style={styles.value}>{lightningAddress}</Text>
          <Text style={styles.label}>{t('v4v.alby.balance')}</Text>
          <Text style={styles.value} testID="value-provider-alby-balance">
            {balance}
          </Text>
          {refreshFailed ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.error}
              testID="value-provider-alby-error"
            >
              {t('v4v.alby.refresh_failed')}
            </Text>
          ) : null}
        </View>
      </Card>
      <FormActions
        actions={[
          {
            label: t('v4v.alby.disconnect'),
            onPress: () => {
              setDisconnectVisible(true);
            },
            testID: 'value-provider-alby-disconnect',
            variant: 'danger',
          },
        ]}
        style={styles.actions}
      />
      {dialogs}
    </MobileScreenContainer>
  );
}
