import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChannelFeedSettingsGroup, useFeedParseStatusLines } from '../../../components/channel';
import { SettingsGroup, SettingsRowDescription } from '../../../components/form';
import { Button } from '../../../components/primitives/Button';
import { useAddByRssParsePath } from '../../../hooks/useAddByRssParsePath';
import {
  BottomChromeScrollSpacer,
  useBottomChromeScrollIndicatorInsets,
} from '../../../theme/bottomChromeOverlayInset';
import { screenBodyInsets, settingsCardInnerGap } from '../../../theme/screenLayout';
import type { ThemedStylesTheme } from '../../../theme/useThemedStyles';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { AddByRssCredentialsFields } from '../../rss/AddByRssCredentialsFields';
import { useAddByRssCredentialsForm } from '../../rss/useAddByRssCredentialsForm';
import type { AddByRssHomeDetailData } from '../addByRssHomeDetailData';
import type { AddByRssFeedCheck } from './useAddByRssFeedCheck';

export type AddByRssSettingsPaneProps = {
  detail: AddByRssHomeDetailData;
  feedCheck: AddByRssFeedCheck;
  /** Reload the detail after a save that produced a usable feed. The pane stays open. */
  onCredentialsSaved: () => void;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    cardInner: {
      gap: settingsCardInnerGap(tokens.spacing),
      padding: tokens.spacing.lg,
    },
    notes: {
      gap: tokens.spacing.xs,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      ...screenBodyInsets(tokens.spacing),
      paddingBottom: tokens.spacing.xl,
    },
  });

/** A catalog key has no spaces. Rate-limit copy is already translated and does. */
const feedCheckNoticeText = (noticeKey: string, translate: (key: string) => string): string =>
  noticeKey.includes(' ') ? noticeKey : translate(noticeKey);

/**
 * Settings for one add-by-RSS feed: the feed check, then username and password.
 *
 * Both fields are always shown and filled from the copy stored on this device. Notifications
 * and auto-download are keyed to a server channel, so they are not on this pane.
 */
export function AddByRssSettingsPane({
  detail,
  feedCheck,
  onCredentialsSaved,
}: AddByRssSettingsPaneProps) {
  const { t } = useTranslation();
  const parsePath = useAddByRssParsePath();
  const credentialsNoteKey =
    parsePath === 'device'
      ? 'features.add_by_rss.credentials_page_host_note'
      : 'features.add_by_rss.credentials_page_device_note';
  const styles = useThemedStyles(createStyles);
  const scrollIndicatorInsets = useBottomChromeScrollIndicatorInsets();
  const setNoticeKeyRef = useRef<(noticeKey: string | null) => void>(() => undefined);

  const onSaved = useCallback(() => {
    setNoticeKeyRef.current('features.add_by_rss.status_parsed');
    onCredentialsSaved();
  }, [onCredentialsSaved]);

  const form = useAddByRssCredentialsForm({
    feed: detail.feed,
    onSaved,
  });
  setNoticeKeyRef.current = form.setNoticeKey;

  const statusLines = useFeedParseStatusLines({
    lastFailedParseTime: null,
    lastFinishedParseTime: detail.mappedFeed !== null ? detail.feed.updatedAt : null,
  });

  const feedNotice =
    feedCheck.noticeKey === null ? null : feedCheckNoticeText(feedCheck.noticeKey, t);

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      scrollIndicatorInsets={scrollIndicatorInsets}
      style={styles.scroll}
      testID="add-by-rss-home-settings"
    >
      <ChannelFeedSettingsGroup
        isChecking={feedCheck.isChecking}
        notice={feedNotice}
        onCheck={() => {
          void feedCheck.checkFeed('interactive');
        }}
        statusLines={statusLines}
        testIDPrefix="add-by-rss-home"
      />
      <SettingsGroup
        spaced
        testID="add-by-rss-home-settings-credentials-card"
        title={t('features.add_by_rss.credentials_page_title')}
      >
        <View style={styles.cardInner}>
          <View style={styles.notes}>
            <SettingsRowDescription>{t(credentialsNoteKey)}</SettingsRowDescription>
            <SettingsRowDescription>
              {t('features.add_by_rss.credentials_mobile_media_note')}
            </SettingsRowDescription>
          </View>
          <AddByRssCredentialsFields
            form={form}
            testIDPrefix="add-by-rss-home-settings-credentials"
          />
          <Button
            disabled={!form.canSave || form.isSaving}
            fullWidth
            label={t('features.add_by_rss.credentials_save_and_check')}
            loading={form.isSaving}
            onPress={() => {
              void form.saveAndCheck();
            }}
            size="form"
            testID="add-by-rss-home-settings-credentials-save"
            variant="secondary"
          />
        </View>
      </SettingsGroup>
      <BottomChromeScrollSpacer />
    </ScrollView>
  );
}
