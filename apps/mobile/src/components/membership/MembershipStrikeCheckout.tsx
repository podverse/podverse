import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { DTOBillingStrikeCheckout } from '@podverse/helpers/dto';
import { formatHHMMSS } from '@podverse/helpers/time';

import { useAuth } from '../../auth/AuthProvider';
import { createBillingApi } from '../../billing/billingApi';
import { formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { FormActions } from '../form/FormActions';
import { Button } from '../primitives';
import { LoadingSection } from '../state/LoadingSection';

/** Matches the API poll limit of one read every 2 seconds, with room to spare. */
const STRIKE_CHECKOUT_POLL_MS = 3000;

const QR_SIZE = 240;

type LightningQrProps = {
  backgroundColor: string;
  color: string;
  quietZone: number;
  size: number;
  value: string;
};

const isQrComponent = (value: unknown): value is ComponentType<LightningQrProps> =>
  typeof value === 'function';

/** Loads the QR view only when this panel is on screen, so store builds never touch it. */
const readQrComponent = (loaded: unknown): ComponentType<LightningQrProps> | null => {
  if (isQrComponent(loaded)) {
    return loaded;
  }
  if (
    typeof loaded === 'object' &&
    loaded !== null &&
    'default' in loaded &&
    isQrComponent(loaded.default)
  ) {
    return loaded.default;
  }
  return null;
};

type InvoicePhase = 'creating' | 'ready' | 'pending' | 'expired' | 'failed';

const isTerminalInvoicePhase = (phase: InvoicePhase): boolean =>
  phase === 'expired' || phase === 'failed';

export type MembershipStrikeCheckoutProps = {
  onFailed: () => void;
  onSettled: () => void;
  processorProductId: number;
};

const isPastExpiry = (expiresAt: string): boolean => {
  const expiresMs = Date.parse(expiresAt);
  return !Number.isFinite(expiresMs) || expiresMs <= Date.now();
};

const remainingSeconds = (expiresAt: string): number => {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
};

const formatCheckoutAmount = (amount: string, currency: string, locale: string): string => {
  const value = Number(amount);
  if (!Number.isFinite(value) || currency.length !== 3) {
    return amount;
  }
  try {
    return new Intl.NumberFormat(locale, { currency, style: 'currency' }).format(value);
  } catch {
    return amount;
  }
};

/**
 * Lightning invoice for the unavailable-billing build. Store binaries never mount this.
 * The first read happens when the invoice exists; later reads run every few seconds while
 * this screen is focused.
 */
export function MembershipStrikeCheckout({
  onFailed,
  onSettled,
  processorProductId,
}: MembershipStrikeCheckoutProps) {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const phaseRef = useRef<InvoicePhase>('creating');

  const [attempt, setAttempt] = useState(0);
  const [checkout, setCheckout] = useState<DTOBillingStrikeCheckout | null>(null);
  const [phase, setPhase] = useState<InvoicePhase>('creating');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [openingWallet, setOpeningWallet] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [QrView, setQrView] = useState<ComponentType<LightningQrProps> | null>(null);

  phaseRef.current = phase;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        amount: {
          ...typography.title,
          color: themeStyles.textPrimary.color,
          textAlign: 'center',
        },
        countdown: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          textAlign: 'center',
        },
        qr: {
          alignItems: 'center',
        },
        renew: {
          marginTop: tokens.spacing.base,
        },
        stack: {
          gap: tokens.spacing.base,
        },
        status: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          marginTop: tokens.spacing.base,
          minHeight: 24,
          textAlign: 'center',
        },
        title: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          fontWeight: '400',
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  const billingApi = useCallback(
    () =>
      createBillingApi({
        accessToken: authRef.current.accessToken,
        clearSession: authRef.current.clearSession,
        refreshToken: authRef.current.refreshToken,
        setTokens: authRef.current.setTokens,
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    setCheckout(null);
    setPhase('creating');
    setCopied(false);
    setCopying(false);
    setOpeningWallet(false);

    void billingApi()
      .createStrikeCheckout({ processorProductId })
      .then((next) => {
        if (cancelled) {
          return;
        }
        if (next.state === 'settled') {
          onSettledRef.current();
          return;
        }
        setCheckout(next);
        setSecondsLeft(remainingSeconds(next.expires_at));
        if (next.state === 'expired' || isPastExpiry(next.expires_at)) {
          setPhase('expired');
          return;
        }
        if (next.state === 'pending') {
          setPhase('pending');
          return;
        }
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPhase('failed');
        onFailedRef.current();
      });

    return () => {
      cancelled = true;
    };
  }, [billingApi, processorProductId, attempt]);

  const checkoutId = checkout?.checkout_id ?? null;

  useFocusEffect(
    useCallback(() => {
      if (checkoutId === null) {
        return undefined;
      }

      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const poll = async () => {
        if (stopped || isTerminalInvoicePhase(phaseRef.current)) {
          return;
        }
        try {
          const next = await billingApi().getStrikeCheckout(checkoutId);
          if (stopped || isTerminalInvoicePhase(phaseRef.current)) {
            return;
          }
          setCheckout(next);
          setSecondsLeft(remainingSeconds(next.expires_at));
          if (next.state === 'settled') {
            stopped = true;
            onSettledRef.current();
            return;
          }
          if (next.state === 'expired' || isPastExpiry(next.expires_at)) {
            stopped = true;
            setPhase('expired');
            return;
          }
          if (next.state === 'pending') {
            setPhase('pending');
          }
        } catch {
          // The next interval tries again. A failed read does not grant time.
        }
        if (!stopped) {
          timer = setTimeout(() => {
            void poll();
          }, STRIKE_CHECKOUT_POLL_MS);
        }
      };

      void poll();

      return () => {
        stopped = true;
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      };
    }, [billingApi, checkoutId])
  );

  useEffect(() => {
    if (checkout === null || phase === 'expired' || phase === 'failed' || phase === 'creating') {
      return;
    }
    const tick = () => {
      const nextSeconds = remainingSeconds(checkout.expires_at);
      setSecondsLeft(nextSeconds);
      if (nextSeconds === 0) {
        setPhase('expired');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [checkout, phase]);

  const copyInvoice = () => {
    if (checkout === null || copying) {
      return;
    }
    setCopying(true);
    void Clipboard.setStringAsync(checkout.bolt11)
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        onFailedRef.current();
      })
      .finally(() => {
        setCopying(false);
      });
  };

  const openWallet = () => {
    if (checkout === null || openingWallet) {
      return;
    }
    setOpeningWallet(true);
    void Linking.openURL(`lightning:${checkout.bolt11}`)
      .catch(() => {
        onFailedRef.current();
      })
      .finally(() => {
        setOpeningWallet(false);
      });
  };

  const statusText =
    phase === 'expired'
      ? t('checkout.invoice_expired')
      : phase === 'pending'
        ? t('checkout.payment_detected')
        : copied
          ? t('checkout.invoice_copied')
          : '';

  const showInvoice =
    checkout !== null && phase !== 'creating' && phase !== 'failed' && phase !== 'expired';

  useEffect(() => {
    if (!showInvoice) {
      return;
    }
    let active = true;
    void import('react-native-qrcode-svg')
      .then((loaded) => {
        if (!active) {
          return;
        }
        const component = readQrComponent(loaded);
        if (component === null) {
          return;
        }
        setQrView(() => component);
      })
      .catch(() => {
        // Copy and the wallet link still work when the QR view cannot load.
      });
    return () => {
      active = false;
    };
  }, [showInvoice]);

  return (
    <View
      accessibilityState={{ busy: phase === 'creating' }}
      testID="membership-checkout-strike-invoice"
    >
      {phase === 'creating' ? <LoadingSection testID="membership-checkout-strike-loading" /> : null}
      {checkout !== null && phase !== 'creating' && phase !== 'failed' ? (
        <>
          <View style={styles.stack}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('checkout.lightning_invoice')}
            </Text>
            <Text style={styles.amount}>
              {formatCheckoutAmount(checkout.amount, checkout.currency_code, i18n.language)}
            </Text>
            {showInvoice && QrView !== null ? (
              <View
                accessibilityLabel={t('checkout.lightning_invoice_qr')}
                accessibilityRole="image"
                accessible
                style={styles.qr}
              >
                {/* Black on white so a camera can read the invoice in either theme. */}
                <QrView
                  backgroundColor="#ffffff"
                  color="#000000"
                  quietZone={12}
                  size={QR_SIZE}
                  value={checkout.bolt11}
                />
              </View>
            ) : null}
            {showInvoice ? (
              <Text style={styles.countdown}>
                {t('checkout.invoice_expires_in', { time: formatHHMMSS(secondsLeft) })}
              </Text>
            ) : null}
          </View>
          {showInvoice ? (
            <FormActions
              actions={[
                {
                  label: t('checkout.copy_invoice'),
                  loading: copying,
                  onPress: copyInvoice,
                  testID: 'membership-checkout-strike-copy',
                  variant: 'primary',
                },
                {
                  label: t('checkout.open_wallet'),
                  loading: openingWallet,
                  onPress: openWallet,
                  testID: 'membership-checkout-strike-wallet',
                  variant: 'outline',
                },
              ]}
              style={styles.actions}
            />
          ) : null}
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {statusText}
          </Text>
          {phase === 'expired' ? (
            <View style={styles.renew}>
              <Button
                fullWidth
                label={t('checkout.get_a_new_invoice')}
                onPress={() => {
                  setAttempt((current) => current + 1);
                }}
                size="form"
                testID="membership-checkout-strike-renew"
                variant="primary"
              />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
