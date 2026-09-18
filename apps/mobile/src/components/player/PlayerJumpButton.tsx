import { FontAwesome6 } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import type { ButtonSize } from '../primitives/Button';
import { Button } from '../primitives/Button';

type PlayerJumpButtonProps = {
  direction: 'back' | 'forward';
  onPress: () => void;
  seconds: number;
  showSeconds?: boolean;
  size?: ButtonSize;
  testID: string;
};

const JUMP_GLYPH_SIZE = 30;

export function PlayerJumpButton({
  direction,
  onPress,
  seconds,
  showSeconds = true,
  size = 'lg',
  testID,
}: PlayerJumpButtonProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        glyphLabel: {
          color: tokens.button.secondaryColor,
          fontSize: 10,
          fontWeight: '800',
          position: 'absolute',
          top: 10,
        },
        glyphWrap: {
          alignItems: 'center',
          justifyContent: 'center',
          width: JUMP_GLYPH_SIZE,
        },
      }),
    [tokens.button.secondaryColor]
  );

  const directionLabelKey =
    direction === 'back' ? 'media_player.jump_back' : 'media_player.jump_forward';
  const iconName = direction === 'back' ? 'rotate-left' : 'rotate-right';

  return (
    <Button
      accessibilityLabel={t(directionLabelKey, { seconds })}
      icon={
        <View style={styles.glyphWrap}>
          <FontAwesome6
            color={tokens.button.secondaryColor}
            name={iconName}
            size={JUMP_GLYPH_SIZE}
            solid
          />
          {showSeconds ? <Text style={styles.glyphLabel}>{Math.abs(seconds)}</Text> : null}
        </View>
      }
      iconOnly
      label={t(directionLabelKey, { seconds })}
      onPress={onPress}
      size={size}
      testID={testID}
      variant="ghost"
    />
  );
}
