import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import type { DTOTermsAgreement } from '@podverse/helpers';
import { isCurrentTermsAccepted } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { requestWithMobileAuthRefresh } from '../auth/authRequestWithRefresh';
import { createMobileApiRequestService } from '../auth/mobileApi';
import { ModalSafeArea } from '../components/screen/ModalSafeArea';
import { screenBodyInsets } from '../theme/screenLayout';
import { useTheme } from '../theme/useTheme';
import { AgreementChoices } from './AgreementChoices';
import { setTermsBlocksAccountSync } from './termsSyncGate';

type TermsGateValue = {
  awaitingDismiss: boolean;
};

const TermsGateContext = createContext<TermsGateValue>({ awaitingDismiss: false });

export function useTermsGate(): TermsGateValue {
  return useContext(TermsGateContext);
}

export function TermsAcceptanceProvider({ children }: PropsWithChildren) {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const {
    accessToken,
    account,
    clearSession,
    logout,
    refreshToken,
    setAccount,
    setTokens,
    status,
  } = useAuth();
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [seen, setSeen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const termsCurrent =
    agreement !== null &&
    account !== null &&
    isCurrentTermsAccepted(account.account_terms_acceptance, agreement.version);
  const loadFailed = errorKey !== null && !isLoading;
  // Stay hidden until the served document says this account is behind. A loading flash would
  // present and dismiss the full-screen modal for accounts that are already current.
  const visible =
    status === 'authenticated' &&
    account !== null &&
    ((agreement !== null && !termsCurrent) || loadFailed);
  const blockSync =
    status === 'authenticated' &&
    (account === null || agreement === null || !termsCurrent || loadFailed);

  useEffect(() => {
    setTermsBlocksAccountSync(blockSync);
    return () => {
      setTermsBlocksAccountSync(false);
    };
  }, [blockSync]);

  useEffect(() => {
    if (visible) {
      setSeen(true);
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== 'ios' && seen && !visible) {
      setDismissed(true);
    }
  }, [seen, visible]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setAgreement(null);
      setIsLoading(false);
      setErrorKey(null);
      return;
    }

    const api = createMobileApiRequestService();
    if (api === null) {
      setErrorKey('terms_acceptance.load_error');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    let cancelled = false;
    void api
      .reqLegalTerms({ locale: i18n.language })
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setErrorKey(null);
        }
      })
      .catch((error: unknown) => {
        console.warn('[TermsAcceptanceProvider] load failed', error);
        if (!cancelled) {
          setErrorKey('terms_acceptance.load_error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language, reloadKey, status]);

  const handleAccept = async () => {
    if (agreement === null || !checked) {
      return;
    }
    const updated = await requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      async (api) => {
        await api.reqAccountAcceptTerms({ terms_version: agreement.version });
        return api.reqAuthMe();
      }
    );
    setAccount(updated);
  };

  const awaitingDismiss = (seen || visible) && !dismissed;

  return (
    <TermsGateContext.Provider value={{ awaitingDismiss }}>
      {children}
      <Modal
        animationType="fade"
        onDismiss={() => {
          setDismissed(true);
        }}
        presentationStyle="fullScreen"
        visible={visible}
      >
        <ModalSafeArea testID="terms-acceptance-screen">
          <ScrollView
            contentContainerStyle={[
              styles.body,
              screenBodyInsets(tokens.spacing),
              { paddingBottom: tokens.spacing['2xl'] },
            ]}
          >
            <Text style={[styles.title, { color: themeStyles.textPrimary.color }]}>
              {t('terms_acceptance.header')}
            </Text>
            <AgreementChoices
              acceptLabel={t('terms_acceptance.accept')}
              acceptTestID="terms-acceptance-accept"
              accordionTestID="terms-acceptance-full-agreement"
              accordionTitle={t('terms_acceptance.full_agreement')}
              checkboxChecked={checked}
              checkboxLabel={t('terms_acceptance.checkbox_label')}
              checkboxTestID="terms-acceptance-checkbox"
              dateLabel={
                agreement === null
                  ? null
                  : t('terms_acceptance.agreement_date', {
                      agreement_date: agreement.version,
                    })
              }
              errorKey={errorKey}
              fullMarkdown={agreement?.markdown ?? null}
              isLoading={isLoading}
              onAccept={() => {
                void handleAccept();
              }}
              onCheckboxChange={setChecked}
              onReject={() => {
                void logout();
              }}
              onRetry={() => {
                setReloadKey((current) => current + 1);
              }}
              rejectLabel={t('terms_acceptance.reject')}
              rejectTestID="terms-acceptance-reject"
              version={agreement?.version ?? null}
              requireCheckbox
            />
          </ScrollView>
        </ModalSafeArea>
      </Modal>
    </TermsGateContext.Provider>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
});
