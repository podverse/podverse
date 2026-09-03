import { useMemo } from 'react';
import type { ImageStyle, StyleProp } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type CoverImageProps = {
  uri: string | null | undefined;
  /** Shown when `uri` is missing. Caller localizes. */
  fallbackLabel?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

/**
 * Square cover / artwork. Podcast, episode, and album art stay square — do not pass a
 * `borderRadius` unless a specific surface (for example a circular avatar) needs one.
 */
export function CoverImage({
  accessibilityLabel,
  fallbackLabel,
  style,
  testID,
  uri,
}: CoverImageProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fallback: {
          alignItems: 'center',
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderWidth: 1,
          justifyContent: 'center',
        },
        fallbackText: {
          color: themeStyles.textSecondary.color,
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
        },
        image: {
          backgroundColor: tokens.background.secondary,
        },
      }),
    [themeStyles, tokens]
  );

  const hasUri = uri !== null && uri !== undefined && uri.length > 0;

  if (hasUri) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={accessibilityLabel}
        source={{ uri }}
        style={[styles.image, style]}
        testID={testID}
      />
    );
  }

  return (
    <View style={[styles.fallback, style]} testID={testID}>
      {fallbackLabel !== undefined ? (
        <Text numberOfLines={3} style={styles.fallbackText}>
          {fallbackLabel}
        </Text>
      ) : null}
    </View>
  );
}
