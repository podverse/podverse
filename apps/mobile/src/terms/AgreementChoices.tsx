import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCopyMarkdownIntro } from '@podverse/helpers';

import { CopyMarkdown } from '../components/content/CopyMarkdown';
import { Accordion } from '../components/primitives/Accordion';
import { Button } from '../components/primitives/Button';
import { LoadingSection } from '../components/state/LoadingSection';
import { RetryableError } from '../components/state/RetryableError';
import { formActionsGap, formActionsTopGap } from '../theme/screenLayout';
import { useTheme } from '../theme/useTheme';

type AgreementChoicesProps = {
  acceptLabel: string;
  acceptTestID: string;
  accordionTestID: string;
  accordionTitle: string;
  checkboxChecked?: boolean;
  checkboxLabel?: string;
  checkboxTestID?: string;
  dateLabel: string | null;
  errorKey: string | null;
  fullMarkdown: string | null;
  isLoading: boolean;
  onAccept: () => void;
  onCheckboxChange?: (checked: boolean) => void;
  onReject: () => void;
  onRetry: () => void;
  rejectLabel: string;
  rejectTestID: string;
  requireCheckbox?: boolean;
  version: string | null;
};

export function AgreementChoices({
  acceptLabel,
  acceptTestID,
  accordionTestID,
  accordionTitle,
  checkboxChecked = false,
  checkboxLabel,
  checkboxTestID,
  dateLabel,
  errorKey,
  fullMarkdown,
  isLoading,
  onAccept,
  onCheckboxChange,
  onReject,
  onRetry,
  rejectLabel,
  rejectTestID,
  requireCheckbox = false,
  version,
}: AgreementChoicesProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const intro = fullMarkdown === null ? null : getCopyMarkdownIntro(fullMarkdown);
  const canAccept =
    intro !== null && !isLoading && errorKey === null && version !== null && version !== '';
  const acceptDisabled = !canAccept || (requireCheckbox && !checkboxChecked);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          alignSelf: 'stretch',
          gap: formActionsGap(tokens.spacing),
          marginTop: formActionsTopGap(tokens.spacing),
          width: '100%',
        },
        body: {
          gap: tokens.spacing.md,
        },
        checkboxRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: tokens.spacing.md,
        },
        checkboxLabel: {
          color: themeStyles.textPrimary.color,
          flex: 1,
        },
        date: {
          color: themeStyles.textSecondary.color,
        },
        mark: {
          borderColor: themeStyles.textPrimary.color,
          borderWidth: 1,
          height: 22,
          width: 22,
        },
        markChecked: {
          backgroundColor: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View>
      <View style={styles.body}>
        {isLoading ? <LoadingSection testID="agreement-loading" /> : null}
        {!isLoading && errorKey !== null ? (
          <RetryableError errorKey={errorKey} onRetry={onRetry} testID="agreement-error" />
        ) : null}
        {canAccept && intro !== null ? <CopyMarkdown markdown={intro} /> : null}
        {dateLabel !== null ? <Text style={styles.date}>{dateLabel}</Text> : null}
        {requireCheckbox && checkboxLabel !== undefined && onCheckboxChange !== undefined ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checkboxChecked }}
            onPress={() => {
              onCheckboxChange(!checkboxChecked);
            }}
            style={styles.checkboxRow}
            testID={checkboxTestID}
          >
            <View style={[styles.mark, checkboxChecked ? styles.markChecked : null]} />
            <Text style={styles.checkboxLabel}>{checkboxLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          disabled={isLoading}
          fullWidth
          label={rejectLabel}
          onPress={onReject}
          testID={rejectTestID}
          variant="secondary"
        />
        <Button
          disabled={acceptDisabled}
          fullWidth
          label={acceptLabel}
          onPress={onAccept}
          testID={acceptTestID}
        />
      </View>
      {canAccept && fullMarkdown !== null ? (
        <Accordion testID={accordionTestID} title={accordionTitle}>
          <CopyMarkdown markdown={fullMarkdown} />
        </Accordion>
      ) : null}
    </View>
  );
}
