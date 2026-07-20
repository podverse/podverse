/**
 * Dev-only smoke for the shared visual primitives (Track 9b.6 / detail 495). Renders `ScreenHeader`
 * + `Card` + `ListRow` + `Button` so a manual run exercises all four primitives and theme switching
 * in one place. Rendered only in dev (never a release build) and skipped under E2E so the
 * hello-world flow's layout and screenshots stay stable — see HelloWorldScreen.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ListRow, ScreenHeader } from '../components/primitives';
import { useTheme } from '../theme/useTheme';

export function PrimitivesDebugPanel() {
  const { styles: themeStyles, tokens } = useTheme();
  const [pressCount, setPressCount] = useState<number>(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          marginTop: tokens.spacing.xl,
          paddingTop: tokens.spacing.lg,
          width: '100%',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.wrapper} testID="primitives-debug-panel">
      <ScreenHeader
        subtitle="Track 9b.6 shared visual primitives scaffold"
        testID="primitives-debug-header"
        title="Primitives"
      />
      <Card testID="primitives-debug-card">
        <ListRow
          subtitle={`Pressed ${pressCount} time(s)`}
          testID="primitives-debug-row"
          title="ListRow primitive"
          trailing={
            <Button
              label="Secondary"
              onPress={() => setPressCount((count) => count + 1)}
              testID="primitives-debug-button-secondary"
              variant="secondary"
            />
          }
        />
        <Button
          fullWidth
          label="Press me"
          onPress={() => setPressCount((count) => count + 1)}
          testID="primitives-debug-button"
        />
      </Card>
    </View>
  );
}
