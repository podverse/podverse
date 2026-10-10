import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import type { DTOTermsAgreement } from '@podverse/helpers';

import { createMobileApiRequestService } from '../../auth/mobileApi';
import { CopyMarkdown } from '../../components/content/CopyMarkdown';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import { useTheme } from '../../theme/useTheme';

export function MoreTermsOfServiceScreen() {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    const api = createMobileApiRequestService();
    if (api === null) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
    let cancelled = false;
    void api
      .reqLegalTerms({ locale: i18n.language })
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setHasError(false);
        }
      })
      .catch((error: unknown) => {
        console.warn('[MoreTermsOfServiceScreen] load failed', error);
        if (!cancelled) {
          setHasError(true);
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
  }, [i18n.language]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load, reloadKey]);

  const styles = StyleSheet.create({
    date: {
      color: themeStyles.textSecondary.color,
      marginBottom: tokens.spacing.lg,
    },
  });

  return (
    <MobileScreenContainer testID="more-terms-screen">
      {isLoading ? <LoadingSection testID="more-terms-loading" /> : null}
      {!isLoading && hasError ? (
        <RetryableError
          errorKey="terms_acceptance.load_error"
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
          testID="more-terms-error"
        />
      ) : null}
      {agreement !== null && !hasError ? (
        <>
          <Text style={styles.date}>
            {t('terms_acceptance.agreement_date', { agreement_date: agreement.version })}
          </Text>
          <CopyMarkdown markdown={agreement.markdown} />
        </>
      ) : null}
    </MobileScreenContainer>
  );
}
