import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { getCopyMarkdownIntro } from '@podverse/helpers';

import { CopyMarkdown } from '../components/content/CopyMarkdown';
import { Button } from '../components/primitives/Button';
import { LoadingSection } from '../components/state/LoadingSection';
import { RetryableError } from '../components/state/RetryableError';
import { formActionsGap, formActionsTopGap } from '../theme/screenLayout';
import { useTheme } from '../theme/useTheme';

type PopularityTrackingAgreementBodyProps = {
  alreadyAgreed: boolean;
  agreement: DTOPopularityTrackingAgreement | null;
  isLoading: boolean;
  errorKey: string | null;
  learnMoreTestID: string;
  noTestID: string;
  onRetry: () => void;
  onDecision: (accepted: boolean) => void;
  yesTestID: string;
};

export function PopularityTrackingAgreementBody({
  alreadyAgreed,
  agreement,
  isLoading,
  errorKey,
  learnMoreTestID,
  noTestID,
  onRetry,
  onDecision,
  yesTestID,
}: PopularityTrackingAgreementBodyProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [showFullAgreement, setShowFullAgreement] = useState(false);
  const markdown =
    agreement === null
      ? null
      : showFullAgreement
        ? agreement.markdown
        : getCopyMarkdownIntro(agreement.markdown);
  const canInteract = markdown !== null && !isLoading && errorKey === null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          alignSelf: 'stretch',
          gap: formActionsGap(tokens.spacing),
          marginTop: formActionsTopGap(tokens.spacing),
          width: '100%',
        },
        alreadyAgreed: {
          color: themeStyles.textPrimary.color,
        },
        body: {
          gap: tokens.spacing.md,
        },
        date: {
          color: themeStyles.textSecondary.color,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View>
      <View style={styles.body}>
        {isLoading ? <LoadingSection testID="popularity-tracking-agreement-loading" /> : null}
        {!isLoading && errorKey !== null ? (
          <RetryableError
            errorKey={errorKey}
            onRetry={onRetry}
            testID="popularity-tracking-agreement-error"
          />
        ) : null}
        {canInteract && markdown !== null ? <CopyMarkdown markdown={markdown} /> : null}
        {alreadyAgreed ? (
          <Text style={styles.alreadyAgreed}>{t('popularity_tracking.already_agreed')}</Text>
        ) : null}
        {agreement !== null ? (
          <Text style={styles.date}>
            {t('popularity_tracking.agreement_date', {
              agreement_date: agreement.agreement_date,
            })}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          disabled={!canInteract}
          fullWidth
          label={t('popularity_tracking.yes')}
          onPress={() => {
            onDecision(true);
          }}
          testID={yesTestID}
        />
        <Button
          disabled={!canInteract}
          fullWidth
          label={t('popularity_tracking.no')}
          onPress={() => {
            onDecision(false);
          }}
          testID={noTestID}
          variant="secondary"
        />
        <Button
          disabled={!canInteract}
          fullWidth
          label={
            showFullAgreement
              ? t('popularity_tracking.back_to_choice')
              : t('popularity_tracking.learn_more')
          }
          onPress={() => {
            setShowFullAgreement((current) => !current);
          }}
          testID={learnMoreTestID}
          variant="secondary"
        />
      </View>
    </View>
  );
}
