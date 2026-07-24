/**
 * TEMPORARY spike debug panel (PG-2b, step 2.11 / detail 090).
 *
 * Exercises the native playback bridge end-to-end (load / play / pause / seek / destroy) and shows
 * the latest engine events. This is debug-only scaffolding for the audio spike and may be removed
 * once real player UI (Tracks 10–11) lands. It talks ONLY through `useNativePlaybackBridge` — never
 * the native module directly.
 */

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNativePlaybackBridge } from '../bridge';
import { useTheme } from '../theme/useTheme';

const SAMPLE_AUDIO_URL = 'https://download.samplelib.com/mp3/sample-15s.mp3';

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0.0';
  }
  return value.toFixed(1);
}

export function PlaybackEngineDebugPanel() {
  const { styles: themeStyles, tokens } = useTheme();
  const [state, setState] = useState<string>('idle');
  const [positionSeconds, setPositionSeconds] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [lastEvent, setLastEvent] = useState<string>('none');
  const [error, setError] = useState<string | null>(null);

  const bridge = useNativePlaybackBridge({
    playbackState: (event) => {
      setState(event.state);
      setLastEvent(`playbackState: ${event.state}`);
    },
    progress: (event) => {
      setPositionSeconds(event.positionSeconds);
      setDurationSeconds(event.durationSeconds);
    },
    ended: () => {
      setLastEvent('ended');
    },
    error: (event) => {
      setLastEvent(`error: ${event.kind} (${event.code})`);
      setError(event.message);
    },
    stalled: () => {
      setLastEvent('stalled');
    },
  });

  const run = (action: () => void | Promise<void>) => () => {
    try {
      const result = action();
      if (result instanceof Promise) {
        result.catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err));
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const actions: { label: string; onPress: () => void }[] = [
    { label: 'Load', onPress: run(() => bridge.load({ url: SAMPLE_AUDIO_URL })) },
    { label: 'Play', onPress: run(() => bridge.play()) },
    { label: 'Pause', onPress: run(() => bridge.pause()) },
    { label: 'Seek +5s', onPress: run(() => bridge.seek(positionSeconds + 5)) },
    { label: '1.5x', onPress: run(() => bridge.setRate(1.5)) },
    { label: 'Destroy', onPress: run(() => bridge.destroy()) },
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          backgroundColor: tokens.background.primary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          marginBottom: tokens.spacing.sm,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        buttonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
        },
        buttonRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: tokens.spacing.md,
        },
        error: {
          color: tokens.text.danger,
          fontSize: 12,
          marginTop: tokens.spacing.sm,
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
        status: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
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
    <View style={styles.wrapper} testID="playback-engine-debug-panel">
      <Text style={styles.heading}>Media engine debug (spike)</Text>
      <Text style={styles.status} testID="playback-engine-debug-state">
        state: {state} · {formatSeconds(positionSeconds)}s / {formatSeconds(durationSeconds)}s
      </Text>
      <Text style={styles.status} testID="playback-engine-debug-last-event">
        last event: {lastEvent}
      </Text>
      {error !== null ? (
        <Text style={styles.error} testID="playback-engine-debug-error">
          {error}
        </Text>
      ) : null}
      <View style={styles.buttonRow}>
        {actions.map((action) => (
          <Pressable key={action.label} onPress={action.onPress} style={styles.button}>
            <Text style={styles.buttonLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
