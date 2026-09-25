import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { FormActions, TextField } from '../../components/form';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListEmpty } from '../../components/state/ListEmpty';
import { LoadingSection } from '../../components/state/LoadingSection';
import { addByRssCredentialStore, addByRssRepository } from '../../data';
import { syncEventLogRepository } from '../../data/repositories';
import { buildAddByRssParseFailureLog } from '../../lib/addByRss/addByRssErrorLog';
import { credentialNoticeKeyForParse, toAddByRssCredentials } from '../../lib/addByRss/credentials';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { LibraryStackParamList } from '../../navigation';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { ADD_BY_RSS_ADD_LOG_KIND } from '../../sync/syncJobKinds';
import { formActionsGap, formActionsTopGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type AddByRssCredentialsScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'AddByRssCredentials'
>;

/**
 * Username and password for one add-by-RSS feed on this device. Registered on the Home and
 * My Library stacks so each tab keeps its own history; both reach it from a row in the
 * needs-credentials section. Saving checks the feed right away so the user learns whether the pair
 * works before leaving the screen.
 */
export function AddByRssCredentialsScreen({ navigation, route }: AddByRssCredentialsScreenProps) {
  const { feedIdText } = route.params;
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, account, clearSession, refreshToken, setTokens } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const [feed, setFeed] = useState<MobileAddByRSSFeedRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const isBusyRef = useRef(false);

  // Checking the feed is a server-side parse, the same membership tier as adding one.
  const checkAccess = evaluateFeature('add_by_rss_add');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        copy: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
        },
        feedTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
        feedUrl: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        fields: {
          gap: tokens.spacing.lg,
          marginTop: tokens.spacing.lg,
        },
        intro: {
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.lg,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.md,
        },
        removeAction: {
          marginTop: formActionsGap(tokens.spacing),
        },
      }),
    [themeStyles, tokens]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const record = await addByRssRepository.getFeedByIdText(feedIdText);
      const stored =
        record === null ? null : await addByRssCredentialStore.getForCurrentAccount(record.feedUrl);
      if (cancelled) {
        return;
      }
      setFeed(record);
      if (stored !== null) {
        setUsername(stored.username);
        setPassword(stored.password);
      }
      if (record?.lastAuthFailure === 'credentials_rejected') {
        setNoticeKey('features.add_by_rss.credentials_rejected');
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [feedIdText]);

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const handleSaveAndCheck = useCallback(async () => {
    if (feed === null || isBusyRef.current) {
      return;
    }
    if (!checkAccess.allowed) {
      openGate(checkAccess.reason);
      return;
    }
    const credentials = toAddByRssCredentials(username, password);
    if (credentials === null) {
      setNoticeKey('features.add_by_rss.basic_auth_required_both');
      return;
    }
    const accountIdText = account?.id_text;
    if (accountIdText === undefined) {
      setNoticeKey('features.add_by_rss.credentials_check_failed');
      return;
    }

    Keyboard.dismiss();
    isBusyRef.current = true;
    setIsSaving(true);
    setNoticeKey(null);
    try {
      await addByRssCredentialStore.set(accountIdText, feed.feedUrl, credentials);
      const { requestId, result } = await addByRssRepository.parseNow(
        authContext,
        feed.feedUrl,
        credentials
      );
      // Home stays mounted under its tab, so it will not pick up the new state on its own.
      homeFeedRefresh.notify();

      const failureLog = buildAddByRssParseFailureLog({
        feedUrl: feed.feedUrl,
        jobKind: ADD_BY_RSS_ADD_LOG_KIND,
        occurredAt: Date.now(),
        requestId,
        result,
      });
      if (failureLog === null) {
        navigation.goBack();
        return;
      }
      void syncEventLogRepository.append(failureLog);
      setNoticeKey(
        credentialNoticeKeyForParse(result) ?? 'features.add_by_rss.credentials_check_failed'
      );
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      setNoticeKey('features.add_by_rss.credentials_check_failed');
    } finally {
      isBusyRef.current = false;
      setIsSaving(false);
    }
  }, [
    account?.id_text,
    authContext,
    checkAccess,
    feed,
    handleGateError,
    navigation,
    openGate,
    password,
    username,
  ]);

  const handleRemove = useCallback(async () => {
    if (feed === null || isBusyRef.current) {
      return;
    }
    isBusyRef.current = true;
    setIsRemoving(true);
    try {
      try {
        await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqAccountUnfollowAddByRSSChannel({ feed_url: feed.feedUrl })
        );
      } catch {
        // The device copy goes regardless; the next follow-list sync settles the account.
      }
      await addByRssRepository.removeFeed(feed.feedUrl);
      homeFeedRefresh.notify();
      navigation.goBack();
    } finally {
      isBusyRef.current = false;
      setIsRemoving(false);
      setShowRemoveConfirm(false);
    }
  }, [authContext, feed, navigation]);

  if (isLoading) {
    return (
      <MobileScreenContainer testID="rss-credentials-screen">
        <LoadingSection testID="rss-credentials-loading" />
      </MobileScreenContainer>
    );
  }

  if (feed === null) {
    return (
      <MobileScreenContainer testID="rss-credentials-screen">
        <ListEmpty messageKey="errors.generic" testID="rss-credentials-missing-feed" />
      </MobileScreenContainer>
    );
  }

  const isBusy = isSaving || isRemoving;

  return (
    <MobileScreenContainer testID="rss-credentials-screen">
      <Text accessibilityRole="header" style={styles.feedTitle} testID="rss-credentials-title">
        {feed.title ?? feed.feedUrl}
      </Text>
      <Text style={styles.feedUrl} testID="rss-credentials-feed-url">
        {feed.feedUrl}
      </Text>

      <View style={styles.intro}>
        <Text style={styles.copy}>{t('features.add_by_rss.credentials_page_intro')}</Text>
        <Text style={styles.copy} testID="rss-credentials-device-note">
          {t('features.add_by_rss.credentials_page_device_note')}
        </Text>
        <Text style={styles.copy} testID="rss-credentials-media-note">
          {t('features.add_by_rss.credentials_mobile_media_note')}
        </Text>
      </View>

      <View style={styles.fields}>
        <TextField
          accessibilityLabel={t('features.add_by_rss.basic_auth_username')}
          autoCapitalize="none"
          autoCorrect={false}
          eyebrow={t('features.add_by_rss.basic_auth_username')}
          onChangeText={setUsername}
          placeholder={t('features.add_by_rss.basic_auth_username')}
          testID="rss-credentials-username"
          value={username}
        />
        <TextField
          accessibilityLabel={t('features.add_by_rss.basic_auth_password')}
          autoCapitalize="none"
          autoCorrect={false}
          eyebrow={t('features.add_by_rss.basic_auth_password')}
          onChangeText={setPassword}
          placeholder={t('features.add_by_rss.basic_auth_password')}
          secureTextEntry
          testID="rss-credentials-password"
          value={password}
        />
      </View>

      {noticeKey !== null ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.notice}
          testID="rss-credentials-notice"
        >
          {t(noticeKey)}
        </Text>
      ) : null}

      <FormActions
        actions={[
          {
            disabled: isBusy,
            label: t('features.add_by_rss.credentials_save_and_check'),
            loading: isSaving,
            onPress: () => {
              void handleSaveAndCheck();
            },
            testID: 'rss-credentials-save',
          },
        ]}
        style={styles.actions}
      />
      <FormActions
        actions={[
          {
            disabled: isBusy,
            label: t('features.add_by_rss.credentials_remove_feed'),
            loading: isRemoving,
            onPress: () => {
              setShowRemoveConfirm(true);
            },
            testID: 'rss-credentials-remove',
            variant: 'danger',
          },
        ]}
        style={styles.removeAction}
      />
      <ConfirmDialog
        body={t('features.add_by_rss.credentials_remove_feed_confirm')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="rss-credentials-remove-cancel"
        confirmLabel={t('features.add_by_rss.credentials_remove_feed')}
        confirmTestID="rss-credentials-remove-confirm"
        onCancel={() => {
          setShowRemoveConfirm(false);
        }}
        onConfirm={() => {
          void handleRemove();
        }}
        testID="rss-credentials-remove-dialog"
        title={t('features.add_by_rss.credentials_remove_feed')}
        visible={showRemoveConfirm}
      />
    </MobileScreenContainer>
  );
}
