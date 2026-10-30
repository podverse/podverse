import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Modal, ScrollView, StyleSheet, Text } from 'react-native';

import type { DTOTasteProfileAgreement, DTOTermsAgreement } from '@podverse/helpers';
import { isCurrentTermsAccepted, isTasteProfileConsentOptOutDestructive } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { requestWithMobileAuthRefresh } from '../auth/authRequestWithRefresh';
import { createMobileApiRequestService } from '../auth/mobileApi';
import { syncAllowListenStatsToAccountSettings } from '../auth/syncAccountPrefs';
import { ModalSafeArea } from '../components/screen/ModalSafeArea';
import { LoadingSection } from '../components/state/LoadingSection';
import { TasteProfileAgreementBody } from '../tasteProfileConsent/TasteProfileAgreementBody';
import { setTasteProfileAgreementCurrentVersion } from '../tasteProfileConsent/tasteProfileConsentGate';
import { TasteProfileConsentOptOutPanel } from '../tasteProfileConsent/TasteProfileConsentOptOutPanel';
import { screenBodyInsets } from '../theme/screenLayout';
import { useTheme } from '../theme/useTheme';
import { AccountAccessPanel } from './AccountAccessPanel';
import type { AccountConsentPhase } from './accountConsentPhase';
import { resolveAccountConsentPhase } from './accountConsentPhase';
import { setAccountConsentSettled } from './accountConsentSettled';
import { AgreementChoices } from './AgreementChoices';
import { setTermsBlocksAccountSync } from './termsSyncGate';

type ShownConsentPhase = Exclude<AccountConsentPhase, 'none'>;

function consentTestId(phase: ShownConsentPhase): string {
  switch (phase) {
    case 'account-access':
      return 'account-access-screen';
    case 'taste-profile-consent':
      return 'taste-profile-consent-prompt';
    case 'resolving':
      return 'account-consent-resolving';
    case 'terms':
      return 'terms-acceptance-screen';
  }
}

export function TermsAcceptanceProvider({ children }: PropsWithChildren) {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, account, clearSession, refreshToken, setAccount, setTokens, status } =
    useAuth();
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAccountAccess, setShowAccountAccess] = useState(false);
  const [presentedConsent, setPresentedConsent] = useState(false);
  const [tasteProfileAgreement, setTasteProfileAgreement] =
    useState<DTOTasteProfileAgreement | null>(null);
  const [tasteProfileAgreementLoading, setTasteProfileAgreementLoading] = useState(false);
  const [tasteProfileConsentErrorKey, setTasteProfileConsentErrorKey] = useState<string | null>(
    null
  );
  const [tasteProfileAgreementReloadKey, setTasteProfileAgreementReloadKey] = useState(0);
  const [tasteProfileOptOutConfirming, setTasteProfileOptOutConfirming] = useState(false);
  const decidingRef = useRef(false);
  const previousPhaseRef = useRef<AccountConsentPhase>('none');
  const retainedPhaseRef = useRef<ShownConsentPhase>('terms');

  const termsCurrent =
    agreement !== null &&
    account !== null &&
    isCurrentTermsAccepted(account.account_terms_acceptance, agreement.version);
  const loadFailed = errorKey !== null && !isLoading && !accepting;
  // Stay hidden until the served document says this account is behind. A loading flash would
  // present the full-screen modal for accounts that are already current.
  const termsOutstanding =
    status === 'authenticated' &&
    account !== null &&
    ((agreement !== null && !termsCurrent) || loadFailed);
  const termsStatusKnown = agreement !== null || loadFailed;
  const blockSync =
    status === 'authenticated' &&
    (account === null || agreement === null || !termsCurrent || loadFailed);
  const tasteProfileAgreementVersion = tasteProfileAgreement?.version ?? '';
  const tasteProfileAgreementLoadFailed =
    tasteProfileConsentErrorKey !== null && !tasteProfileAgreementLoading;
  const phase = resolveAccountConsentPhase({
    accountPresent: account !== null,
    authenticated: status === 'authenticated',
    decision: account?.account_settings ?? null,
    tasteProfileAgreementLoadFailed,
    tasteProfileAgreementVersion,
    presentedConsent,
    showAccountAccess,
    termsOutstanding,
    termsStatusKnown,
  });
  if (phase !== 'none') {
    retainedPhaseRef.current = phase;
  }
  // Keep the last screen painted while the modal fades out.
  const contentPhase: ShownConsentPhase = phase === 'none' ? retainedPhaseRef.current : phase;
  const tasteProfileAgreementBodyLoading =
    tasteProfileAgreementLoading ||
    (tasteProfileAgreement === null && tasteProfileConsentErrorKey === null);
  // Until the Taste Profile agreement loads or fails, `phase` can still move off 'none'.
  const consentSettled =
    status === 'authenticated' &&
    account !== null &&
    !blockSync &&
    phase === 'none' &&
    (tasteProfileAgreementVersion !== '' || tasteProfileAgreementLoadFailed);

  useEffect(() => {
    setTermsBlocksAccountSync(blockSync);
    return () => {
      setTermsBlocksAccountSync(false);
    };
  }, [blockSync]);

  useEffect(() => {
    setAccountConsentSettled(consentSettled);
    return () => {
      setAccountConsentSettled(false);
    };
  }, [consentSettled]);

  useEffect(() => {
    if (phase === 'terms' || phase === 'account-access') {
      setPresentedConsent(true);
    }
  }, [phase]);

  useEffect(() => {
    const previous = previousPhaseRef.current;
    previousPhaseRef.current = phase;
    // The first present moves assistive-tech focus into the modal. Later swaps stay in
    // that same modal, so the new screen title has to be announced on its own.
    if (phase === 'none' || previous === 'none' || previous === phase) {
      return;
    }
    const message =
      phase === 'account-access'
        ? t('account_access.title')
        : phase === 'taste-profile-consent'
          ? t('taste_profile.title')
          : phase === 'resolving'
            ? t('misc.loading')
            : t('terms_acceptance.header');
    AccessibilityInfo.announceForAccessibility(message);
  }, [phase, t]);

  useEffect(() => {
    if (phase !== 'taste-profile-consent') {
      setTasteProfileOptOutConfirming(false);
    }
  }, [phase]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setAgreement(null);
      setIsLoading(false);
      setAccepting(false);
      setErrorKey(null);
      setShowAccountAccess(false);
      setPresentedConsent(false);
      setTasteProfileAgreement(null);
      setTasteProfileAgreementCurrentVersion('');
      setTasteProfileAgreementLoading(false);
      setTasteProfileConsentErrorKey(null);
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

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    if (blockSync) {
      setTasteProfileAgreementLoading(false);
      return;
    }

    setTasteProfileAgreementLoading(true);
    setTasteProfileConsentErrorKey(null);
    let cancelled = false;
    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      (api) => api.reqLegalTasteProfileAgreement()
    )
      .then((data) => {
        if (cancelled) {
          return;
        }
        setTasteProfileAgreement(data);
        setTasteProfileAgreementCurrentVersion(data.version);
        setTasteProfileConsentErrorKey(null);
      })
      .catch((error: unknown) => {
        console.warn('[TermsAcceptanceProvider] Taste Profile agreement load failed', error);
        if (!cancelled) {
          setTasteProfileConsentErrorKey('errors.generic');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTasteProfileAgreementLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    blockSync,
    clearSession,
    tasteProfileAgreementReloadKey,
    refreshToken,
    setTokens,
    status,
  ]);

  useEffect(() => {
    if (termsCurrent) {
      setShowAccountAccess(false);
    }
  }, [termsCurrent]);

  const handleAccept = async () => {
    if (agreement === null || !checked || accepting) {
      return;
    }
    setAccepting(true);
    setErrorKey(null);
    try {
      const updated = await requestWithMobileAuthRefresh(
        { accessToken, clearSession, refreshToken, setTokens },
        async (api) => {
          await api.reqAccountAcceptTerms({ terms_version: agreement.version });
          return api.reqAuthMe();
        }
      );
      setAccount(updated);
    } catch (error: unknown) {
      console.warn('[TermsAcceptanceProvider] accept failed', error);
      setErrorKey('terms_acceptance.load_error');
    } finally {
      setAccepting(false);
    }
  };

  const handleTasteProfileConsentDecision = async (accepted: boolean) => {
    if (decidingRef.current) {
      return;
    }
    decidingRef.current = true;
    try {
      await syncAllowListenStatsToAccountSettings({
        accepted,
        auth: { accessToken, clearSession, refreshToken, setTokens },
        setAccount,
      });
    } finally {
      decidingRef.current = false;
    }
  };

  return (
    <>
      {children}
      {/*
        One full-screen modal for terms, account access, and Taste Profile consent. A second modal
        cannot present in the same turn this one dismisses (mobile-modal-presentation-lifecycle).
      */}
      <Modal animationType="fade" presentationStyle="fullScreen" visible={phase !== 'none'}>
        <ModalSafeArea testID={consentTestId(contentPhase)}>
          <ScrollView
            contentContainerStyle={[
              styles.body,
              screenBodyInsets(tokens.spacing),
              { paddingBottom: tokens.spacing['2xl'] },
            ]}
            keyboardShouldPersistTaps="handled"
            key={`${contentPhase}-${tasteProfileOptOutConfirming ? 'opt-out' : 'choice'}`}
          >
            {contentPhase === 'terms' ? (
              <>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: themeStyles.textPrimary.color }]}
                >
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
                  isLoading={isLoading || accepting}
                  onAccept={() => {
                    void handleAccept();
                  }}
                  onCheckboxChange={setChecked}
                  onReject={() => {
                    setShowAccountAccess(true);
                  }}
                  onRetry={() => {
                    setReloadKey((current) => current + 1);
                  }}
                  rejectLabel={t('terms_acceptance.reject')}
                  rejectTestID="terms-acceptance-reject"
                  requireCheckbox
                  version={agreement?.version ?? null}
                />
              </>
            ) : null}
            {contentPhase === 'account-access' ? (
              <AccountAccessPanel
                onReviewTerms={() => {
                  setShowAccountAccess(false);
                }}
              />
            ) : null}
            {contentPhase === 'taste-profile-consent' ? (
              <>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: themeStyles.textPrimary.color }]}
                >
                  {tasteProfileOptOutConfirming
                    ? t('taste_profile_consent.opt_out_confirm_title')
                    : t('taste_profile.title')}
                </Text>
                {tasteProfileOptOutConfirming ? (
                  <TasteProfileConsentOptOutPanel
                    onCancel={() => {
                      setTasteProfileOptOutConfirming(false);
                    }}
                    onConfirm={() => {
                      setTasteProfileOptOutConfirming(false);
                      void handleTasteProfileConsentDecision(false);
                    }}
                  />
                ) : (
                  <TasteProfileAgreementBody
                    accordionTestID="taste-profile-consent-full-agreement"
                    agreement={tasteProfileAgreement}
                    errorKey={tasteProfileConsentErrorKey}
                    isLoading={tasteProfileAgreementBodyLoading}
                    noTestID="taste-profile-consent-no"
                    onDecision={(accepted) => {
                      if (
                        !accepted &&
                        isTasteProfileConsentOptOutDestructive(account?.account_settings)
                      ) {
                        setTasteProfileOptOutConfirming(true);
                        AccessibilityInfo.announceForAccessibility(
                          t('taste_profile_consent.opt_out_confirm_title')
                        );
                        return;
                      }
                      void handleTasteProfileConsentDecision(accepted);
                    }}
                    onRetry={() => {
                      setTasteProfileAgreementReloadKey((current) => current + 1);
                    }}
                    yesTestID="taste-profile-consent-yes"
                  />
                )}
              </>
            ) : null}
            {contentPhase === 'resolving' ? <LoadingSection /> : null}
          </ScrollView>
        </ModalSafeArea>
      </Modal>
    </>
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
