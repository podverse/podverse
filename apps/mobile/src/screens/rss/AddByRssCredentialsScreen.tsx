import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { CustomApiNotice } from '../../components/feedback/CustomApiNotice';
import { FormActions } from '../../components/form';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListEmpty } from '../../components/state/ListEmpty';
import { LoadingSection } from '../../components/state/LoadingSection';
import { addByRssRepository } from '../../data';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type { LibraryStackParamList } from '../../navigation';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { formActionsGap, formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { AddByRssCredentialsFields } from './AddByRssCredentialsFields';
import { useAddByRssCredentialsForm } from './useAddByRssCredentialsForm';

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
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [feed, setFeed] = useState<MobileAddByRSSFeedRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const isBusyRef = useRef(false);
  const onSaved = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const form = useAddByRssCredentialsForm({ feed, onSaved });

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
          fontWeight: '400',
        },
        feedUrl: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        fields: {
          marginTop: tokens.spacing.lg,
        },
        intro: {
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.lg,
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
      if (cancelled) {
        return;
      }
      setFeed(record);
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

  const handleRemove = useCallback(async () => {
    if (feed === null || isBusyRef.current || form.isSaving) {
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
  }, [authContext, feed, form.isSaving, navigation]);

  if (isLoading || (feed !== null && !form.isReady)) {
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

  const isBusy = form.isSaving || isRemoving;

  return (
    <MobileScreenContainer testID="rss-credentials-screen">
      <CustomApiNotice />
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
        <AddByRssCredentialsFields form={form} testIDPrefix="rss-credentials" />
      </View>

      <FormActions
        actions={[
          {
            disabled: isBusy || !form.canSave,
            label: t('features.add_by_rss.credentials_save_and_check'),
            loading: form.isSaving,
            onPress: () => {
              void form.saveAndCheck();
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
