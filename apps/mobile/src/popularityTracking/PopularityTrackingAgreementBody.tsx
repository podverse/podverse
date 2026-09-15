import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { getPopularityTrackingAbridgedMarkdown } from '@podverse/helpers';

import { Button } from '../components/primitives/Button';
import { useTheme } from '../theme/useTheme';
import { PopularityTrackingMarkdown } from './PopularityTrackingMarkdown';

type PopularityTrackingAgreementBodyProps = {
  alreadyAgreed: boolean;
  agreement: DTOPopularityTrackingAgreement | null;
  learnMoreTestID: string;
  noTestID: string;
  onDecision: (accepted: boolean) => void;
  yesTestID: string;
};

export function PopularityTrackingAgreementBody({
  alreadyAgreed,
  agreement,
  learnMoreTestID,
  noTestID,
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
        : getPopularityTrackingAbridgedMarkdown(agreement.markdown);

  return (
    <View style={{ gap: tokens.spacing.md }}>
      {markdown !== null ? <PopularityTrackingMarkdown markdown={markdown} /> : null}
      {alreadyAgreed ? (
        <Text style={{ color: themeStyles.textPrimary.color }}>
          {t('popularity_tracking.already_agreed')}
        </Text>
      ) : null}
      {agreement !== null ? (
        <Text style={{ color: themeStyles.textSecondary.color }}>
          {t('popularity_tracking.agreement_date', {
            agreement_date: agreement.agreement_date,
          })}
        </Text>
      ) : null}
      <Button
        label={t('popularity_tracking.yes')}
        onPress={() => {
          onDecision(true);
        }}
        testID={yesTestID}
      />
      <Button
        label={t('popularity_tracking.no')}
        onPress={() => {
          onDecision(false);
        }}
        testID={noTestID}
        variant="secondary"
      />
      <Button
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
  );
}
