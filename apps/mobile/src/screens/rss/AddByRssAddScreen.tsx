import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { HelperNote } from '../../components/feedback/HelperNote';
import { FormActions, SettingsSwitchRow, TextField } from '../../components/form';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListEmpty } from '../../components/state/ListEmpty';
import { getMobileConfig } from '../../config';
import { useAddByRssAddFlow } from '../../hooks/useAddByRssAddFlow';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { LibraryStackParamList } from '../../navigation';
import { useOfflineMode } from '../../prefs/offlineMode';
import { formActionsTopGap, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type AddByRssAddScreenProps = NativeStackScreenProps<LibraryStackParamList, 'AddByRssAdd'>;

/**
 * Add one feed by URL. Username and password stay behind a toggle — most listeners never need them.
 */
export function AddByRssAddScreen({ navigation }: AddByRssAddScreenProps) {
  const { t } = useTranslation();
  const { isE2e } = getMobileConfig();
  const { styles: themeStyles, tokens } = useTheme();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const [inputValue, setInputValue] = useState<string>('');
  const [noticeKey, setNoticeKey] = useState<string | null>(null);

  const {
    addErrorKey,
    addFeed,
    canSubmit,
    handleFeedUrlChange,
    isAdding,
    password,
    setPassword,
    setUseBasicAuth,
    setUsername,
    useBasicAuth,
    username,
  } = useAddByRssAddFlow({
    inputValue,
    onAfterAdd: async () => {
      navigation.goBack();
    },
    onNotice: setNoticeKey,
    setInputValue,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...screenBodyInsets(tokens.spacing),
          gap: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        credentialFields: {
          gap: tokens.spacing.md,
        },
        credentialIntro: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
        submit: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
      }),
    [themeStyles, tokens]
  );

  const handleSubmit = useCallback(() => {
    void addFeed();
  }, [addFeed]);

  if (offlineModeEnabled) {
    return (
      <MobileScreenContainer testID="rss-add-screen">
        <View style={styles.content} testID="rss-add-offline-unavailable">
          <ListEmpty
            messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
            testID="rss-add-offline-unavailable-message"
          />
        </View>
      </MobileScreenContainer>
    );
  }

  return (
    <MobileScreenContainer scrollEnabled testID="rss-add-screen">
      <View style={styles.content}>
        <HelperNote
          message={t('features.add_by_rss.add_feed_instructions')}
          testID="rss-add-instructions"
        />
        <TextField
          accessibilityLabel={t('features.add_by_rss.feed_url')}
          autoCapitalize="none"
          autoCorrect={false}
          eyebrow={t('features.add_by_rss.feed_url')}
          keyboardType="url"
          onChangeText={handleFeedUrlChange}
          placeholder={t('features.add_by_rss.feed_url_example')}
          testID="rss-url-input"
          value={inputValue}
        />
        <SettingsSwitchRow
          onValueChange={setUseBasicAuth}
          testID="rss-basic-auth-toggle"
          title={t('features.add_by_rss.basic_auth_requires')}
          value={useBasicAuth}
        />
        {useBasicAuth ? (
          <View style={styles.credentialFields}>
            <Text style={styles.credentialIntro} testID="rss-basic-auth-description">
              {t('features.add_by_rss.basic_auth_description')}
            </Text>
            <TextField
              accessibilityLabel={t('features.add_by_rss.basic_auth_username')}
              autoCapitalize="none"
              autoCorrect={false}
              eyebrow={t('features.add_by_rss.basic_auth_username')}
              onChangeText={setUsername}
              placeholder={t('misc.required')}
              testID="rss-username-input"
              value={username}
            />
            <TextField
              accessibilityLabel={t('features.add_by_rss.basic_auth_password')}
              autoCapitalize="none"
              autoCorrect={false}
              eyebrow={t('features.add_by_rss.basic_auth_password')}
              onChangeText={setPassword}
              placeholder={t('misc.required')}
              // iOS Autofill plus a secure field blocks Maestro inputText. E2E shows the password in plaintext.
              secureTextEntry={!isE2e}
              testID="rss-password-input"
              value={password}
            />
          </View>
        ) : null}
        <FormActions
          actions={[
            {
              disabled: isAdding || !canSubmit,
              label: t('features.add_by_rss.label'),
              loading: isAdding,
              onPress: handleSubmit,
              testID: 'rss-add-submit',
            },
          ]}
          style={styles.submit}
        />
        {addErrorKey !== null ? (
          <Text style={styles.notice} testID="rss-add-error">
            {t(addErrorKey)}
          </Text>
        ) : null}
        {noticeKey !== null ? (
          <Text style={styles.notice} testID="rss-add-notice">
            {t(noticeKey)}
          </Text>
        ) : null}
      </View>
    </MobileScreenContainer>
  );
}
