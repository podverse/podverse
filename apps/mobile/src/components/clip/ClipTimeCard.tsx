import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatHHMMSS } from '@podverse/helpers/time';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives/Button';

type ClipTimeCardProps = {
  emptyHintKey: string;
  label: string;
  onCapture: () => void;
  onClear?: () => void;
  onPreview?: () => void;
  previewDisabled?: boolean;
  previewTestID?: string;
  seconds: number | null;
  testID: string;
};

export function ClipTimeCard({
  emptyHintKey,
  label,
  onCapture,
  onClear,
  onPreview,
  previewDisabled = false,
  previewTestID,
  seconds,
  testID,
}: ClipTimeCardProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          padding: tokens.spacing.lg,
        },
        heading: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        time: {
          color: themeStyles.textPrimary.color,
          fontSize: 26,
          fontWeight: '700',
          marginTop: tokens.spacing.sm,
        },
        valueHint: {
          color: themeStyles.textSecondary.color,
          fontSize: 16,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const valueLabel = seconds !== null ? formatHHMMSS(Math.max(0, seconds)) : t(emptyHintKey);
  const cardAccessibilityLabel = `${label}, ${valueLabel}`;

  return (
    <Pressable
      accessibilityLabel={cardAccessibilityLabel}
      accessibilityRole="button"
      onPress={onCapture}
      style={styles.card}
      testID={testID}
    >
      <Text style={styles.heading}>{label}</Text>
      {seconds !== null ? (
        <Text style={styles.time} testID={`${testID}-value`}>
          {valueLabel}
        </Text>
      ) : (
        <Text style={styles.valueHint} testID={`${testID}-hint`}>
          {valueLabel}
        </Text>
      )}
      <View style={styles.actions}>
        {onPreview !== undefined && previewTestID !== undefined ? (
          <Button
            disabled={previewDisabled}
            label={t('media_player.play')}
            onPress={(event) => {
              stopPropagation(event);
              onPreview();
            }}
            size="sm"
            testID={previewTestID}
            variant="secondary"
          />
        ) : null}
        {onClear !== undefined ? (
          <Button
            label={t('misc.clear')}
            onPress={(event) => {
              stopPropagation(event);
              onClear();
            }}
            size="sm"
            testID="make-clip-clear-end-time"
            variant="ghost"
          />
        ) : null}
      </View>
    </Pressable>
  );
}
