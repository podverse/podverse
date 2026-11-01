import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { chipFacePadding, chipLabelTypography } from './chipChrome';

const ACTIVITY_INDICATOR_SMALL_SIZE = 20;

export type ChipActionProps = {
  label: string;
  loading?: boolean;
  onPress: () => void;
  testID: string;
};

/**
 * Page action for a chip-row action band. Same face as an idle section chip, with the primary
 * border so it reads as an action rather than a media-type tab. The label stays in the layout
 * while loading so the face does not change size. Mount inside `ChipRowWithActions`.
 */
export function ChipAction({ label, loading = false, onPress, testID }: ChipActionProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const lineHeight =
    typeof chipLabelTypography.lineHeight === 'number' ? chipLabelTypography.lineHeight : 21;
  const spinnerScale = Math.min(1, lineHeight / ACTIVITY_INDICATOR_SMALL_SIZE);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        face: {
          alignItems: 'center',
          backgroundColor: tokens.background.secondary,
          borderColor: tokens.border.primary,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          justifyContent: 'center',
          ...chipFacePadding(tokens.spacing),
        },
        hiddenLabel: {
          opacity: 0,
        },
        label: {
          ...chipLabelTypography,
          color: themeStyles.textPrimary.color,
        },
        pressed: {
          opacity: 0.7,
        },
        spinner: {
          transform: [{ scale: spinnerScale }],
        },
        spinnerHost: {
          alignItems: 'center',
          bottom: 0,
          justifyContent: 'center',
          left: 0,
          overflow: 'hidden',
          position: 'absolute',
          right: 0,
          top: 0,
        },
      }),
    [spinnerScale, themeStyles.textPrimary.color, tokens]
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.face, pressed && !loading ? styles.pressed : null]}
      testID={testID}
    >
      <Text style={[styles.label, loading ? styles.hiddenLabel : null]}>{label}</Text>
      {loading ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.spinnerHost}
        >
          <ActivityIndicator
            color={themeStyles.textPrimary.color}
            size="small"
            style={styles.spinner}
          />
        </View>
      ) : null}
    </Pressable>
  );
}
