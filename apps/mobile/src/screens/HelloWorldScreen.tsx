import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_LOCALE } from '@podverse/helpers/locales';

const APP_DISPLAY_NAME = 'Podverse Next';

export function HelloWorldScreen() {
  const version = Constants.expoConfig?.version ?? 'unknown';

  return (
    <View style={styles.container} testID="hello-world-screen">
      <Text style={styles.title} testID="hello-world-title">
        {APP_DISPLAY_NAME}
      </Text>
      <Text style={styles.subtitle} testID="hello-world-version">
        Version {version}
      </Text>
      <Text style={styles.helperSmoke} testID="hello-world-helpers-smoke">
        Shared package smoke: default locale {DEFAULT_LOCALE}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  helperSmoke: {
    color: '#666666',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: '#333333',
    fontSize: 18,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
});
