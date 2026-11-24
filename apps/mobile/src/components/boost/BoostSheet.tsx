import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { primaryListArtworkUrl } from '@podverse/helpers';
import { showBoostNameAndMessageFields } from '@podverse/v4v-helpers';

import type { MobileBoostFailureCopy } from '../../lib/boost/mobileBoostFailureCopy';
import { parseBoostSatsAmount } from '../../lib/boost/mobileBoostRecipients';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { formActionsTopGap, LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import type { FormAction } from '../form/FormActions';
import { FormActions } from '../form/FormActions';
import { TextField } from '../form/TextField';
import { AppOverlay, OverlayPanel, OverlayScrim } from '../overlay';
import { Button, CoverImage } from '../primitives';
import { HeaderBarAction } from '../screen/HeaderBarAction';
import {
  boostRecipientsForTab,
  boostValueDenominationKey,
  boostValueLabelKey,
  buildBoostValueTabs,
  recipientTypesForTab,
} from './boostFormModel';
import type { BoostSheetNotice, BoostSheetRecipientStatus } from './useBoostSheetSend';
import {
  lightningValueRecipientsForTarget,
  manualLightningRowsForTarget,
  useBoostSheetSend,
} from './useBoostSheetSend';

export type BoostSheetItem = {
  guid?: string | null;
  id_text: string;
  item_images?: DTOItem['item_images'];
  item_values?: DTOItem['item_values'];
  title?: string | null;
};

export type BoostSheetAddByRss = {
  feedIdText: string;
  feedUrl: string;
  /** Null on a channel screen. Episode, track, or live item key on an item screen and during playback. */
  itemKey: string | null;
};

export type BoostSheetTarget = {
  /** Null for directory content. Non-null means the ids below are local Add by RSS ids. */
  addByRss: BoostSheetAddByRss | null;
  channel: DTOChannel;
  item: BoostSheetItem | null;
};

type BoostSheetProps = {
  onClose: () => void;
  target: BoostSheetTarget | null;
};

type NoticeCopy = {
  body: string;
  button: string;
  title: string;
};

type SheetTranslate = (key: string, values?: Record<string, string | number>) => string;

const DEFAULT_AMOUNT = '1';

const failureExtra = (failure: MobileBoostFailureCopy, t: SheetTranslate): string | null => {
  switch (failure.kind) {
    case 'failed':
      return null;
    case 'invoice_timeout':
      return t('value.boost_messages.invoice_timeout');
    case 'not_configured':
      return t('v4v.alby.not_configured');
    case 'provider_message':
      return failure.message;
    case 'session_ended':
      return t('v4v.alby.session_ended_body');
  }
};

const lightningStatusCopy = (status: BoostSheetRecipientStatus, t: SheetTranslate): string => {
  const lines: string[] = [];
  switch (status.phase) {
    case 'paying':
      lines.push(t('value.boost_messages.status_paying'));
      lines.push(...status.attemptLines);
      break;
    case 'success':
      lines.push(t('value.boost_messages.status_success'));
      break;
    case 'failed':
      lines.push(t('value.boost_messages.status_failed'));
      lines.push(...status.attemptLines);
      if (status.failure !== null) {
        const extra = failureExtra(status.failure, t);
        if (extra !== null) {
          lines.push(extra);
        }
      }
      break;
  }
  return lines.join('\n');
};

const noticeCopy = (notice: BoostSheetNotice, t: SheetTranslate): NoticeCopy => {
  switch (notice.kind) {
    case 'offline':
      return {
        title: t('value.boost'),
        body: t('settings.offline_mode.unavailable'),
        button: t('misc.ok'),
      };
    case 'rate_limited': {
      // i18next selects the plural form from `count`, so pass it with the catalog name.
      const seconds = Math.ceil(notice.retryAfterMs / 1000);
      const minutes = Math.max(1, Math.ceil(notice.retryAfterMs / 60000));
      const body =
        notice.retryAfterMs <= 90000
          ? t('value.boost_messages.mint_rate_limit_wait_seconds', { count: seconds, seconds })
          : t('value.boost_messages.mint_rate_limit_wait_minutes', { count: minutes, minutes });
      return {
        title: t('value.boost_messages.mint_rate_limit_modal_title'),
        body,
        button: t('misc.ok'),
      };
    }
    case 'rate_limit_unavailable':
      return {
        title: t('value.boost_messages.mint_rate_limit_modal_title'),
        body: t('value.boost_messages.mint_rate_limit_preflight_error'),
        button: t('misc.ok'),
      };
    case 'session_ended':
      return {
        title: t('v4v.alby.session_ended_title'),
        body: t('v4v.alby.session_ended_body'),
        button: t('misc.ok'),
      };
    case 'metaboost_offline':
      return {
        title: t('value.boost_messages.mbrss_offline_modal_title'),
        body: t('value.boost_messages.mbrss_offline_modal_body'),
        button: t('value.boost_messages.mbrss_offline_continue'),
      };
    case 'sender_blocked':
      return {
        title: t('value.boost_messages.sender_blocked_modal_title'),
        body:
          notice.detail !== null && notice.detail.trim() !== ''
            ? notice.detail
            : t('value.boost_messages.sender_blocked_post_fallback'),
        button: t('value.boost_messages.sender_blocked_modal_primary'),
      };
    case 'owner_terms':
      return {
        title: t('value.boost_messages.owner_terms_not_accepted_modal_title'),
        body:
          notice.detail !== null && notice.detail.trim() !== ''
            ? notice.detail
            : t('value.boost_messages.owner_terms_not_accepted_post_fallback'),
        button: t('value.boost_messages.owner_terms_not_accepted_modal_primary'),
      };
    case 'post_failed':
      return {
        title: t('value.boost_messages.metaboost_post_failed_modal_title'),
        body:
          notice.detail !== null && notice.detail.trim() !== ''
            ? notice.detail
            : t('value.boost_messages.metaboost_post_failed_fallback'),
        button: t('value.boost_messages.metaboost_post_failed_modal_primary'),
      };
  }
};

/**
 * Creator boost form in a bottom sheet. Lightning submit pays through the connected value
 * provider. Other value tabs tell the listener that sending is not available yet.
 */
export function BoostSheet({ onClose, target }: BoostSheetProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedKey, setSelectedKey] = useState('');
  const send = useBoostSheetSend(target);
  const noticeCopyRef = useRef<NoticeCopy | null>(null);

  const channelId = target?.channel.id_text ?? '';
  const itemId = target?.item?.id_text ?? '';

  useEffect(() => {
    setSelectedKey('');
  }, [channelId, itemId]);

  if (send.notice !== null) {
    noticeCopyRef.current = noticeCopy(send.notice, t);
  }
  const shownNotice = noticeCopyRef.current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        amountRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        artwork: {
          height: LIST_ROW_ARTWORK_SIZE,
          width: LIST_ROW_ARTWORK_SIZE,
        },
        backdrop: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        connect: {
          marginTop: tokens.spacing.md,
        },
        danger: {
          color: tokens.text.danger,
          marginTop: tokens.spacing.xs,
        },
        denomination: {
          color: themeStyles.textSecondary.color,
        },
        header: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        link: {
          color: tokens.text.link,
          marginTop: tokens.spacing.xs,
        },
        media: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
        },
        mediaText: {
          flex: 1,
        },
        recipient: {
          color: themeStyles.textPrimary.color,
          marginTop: tokens.spacing.xs,
        },
        scrim: {
          ...StyleSheet.absoluteFill,
        },
        scroll: {
          maxHeight: 480,
        },
        sheet: {
          backgroundColor: tokens.background.primary,
          borderTopLeftRadius: tokens.radii.md,
          borderTopRightRadius: tokens.radii.md,
          padding: tokens.spacing.lg,
        },
        status: {
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        subtitle: {
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        tab: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        tabSelected: {
          borderColor: tokens.text.warning,
        },
        tabs: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.lg,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '700',
        },
      }),
    [themeStyles, tokens]
  );

  const tabs = useMemo(() => {
    if (target === null) {
      return [];
    }
    return buildBoostValueTabs(target.channel, target.item);
  }, [target]);

  const activeKey = selectedKey.length > 0 ? selectedKey : (tabs[0]?.key ?? '');
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0] ?? null;
  const parsedAmount = Number(send.amount);
  const totalAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const lightningTab = activeKey === 'lightning';
  const lightningRecipients =
    target !== null && lightningTab ? lightningValueRecipientsForTarget(target) : [];
  const otherRecipientTypes = lightningTab ? [] : recipientTypesForTab(activeTab);
  const hasLnaddressRecipient = lightningTab
    ? lightningRecipients.some((recipient) => recipient.type === 'lnaddress')
    : otherRecipientTypes.some((type) => type === 'lnaddress');
  const hasNodeRecipient = lightningTab
    ? lightningRecipients.some((recipient) => recipient.type === 'node')
    : otherRecipientTypes.some((type) => type === 'node');
  const showNameAndMessage =
    activeTab !== null &&
    showBoostNameAndMessageFields({
      hasLnaddressRecipient,
      hasMetaBoost: send.hasMetaBoost,
      hasNodeRecipient,
    });
  const denominationKey = activeTab === null ? null : boostValueDenominationKey(activeTab.key);
  const artworkUri =
    target === null
      ? null
      : primaryListArtworkUrl(target.item?.item_images, target.channel.channel_images);
  const heading =
    target === null
      ? ''
      : target.item !== null
        ? (target.item.title ?? target.channel.title)
        : target.channel.title;
  const subtitle = target?.item !== null && target !== null ? target.channel.title : null;
  const lightningRows =
    target !== null && lightningTab ? manualLightningRowsForTarget(target, send.amount) : null;
  const otherRecipients =
    lightningRows === null ? boostRecipientsForTab(activeTab, totalAmount) : [];
  const parsedSats = parseBoostSatsAmount(send.amount);
  const submitDisabled =
    lightningTab && (send.submitBusy || send.albyPhase !== 'connected' || parsedSats === null);
  const actions: FormAction[] = [
    {
      label: t('misc.cancel'),
      onPress: onClose,
      testID: 'boost-sheet-cancel',
      variant: 'secondary',
    },
    send.showBack
      ? {
          label: t('misc.go_back'),
          onPress: send.goBack,
          testID: 'boost-sheet-back',
        }
      : {
          disabled: submitDisabled,
          label: t('misc.submit'),
          loading: lightningTab && send.submitBusy,
          onPress: () => {
            send.submit(activeKey);
          },
          testID: 'boost-sheet-submit',
        },
  ];
  const senderBlockText =
    send.senderBlockMessage !== null && send.senderBlockMessage.trim() !== ''
      ? send.senderBlockMessage
      : t('value.boost_messages.sender_blocked_preflight_fallback');
  const termsLabel = t('value.meta_boost.title');

  return (
    <>
      <AppOverlay animation="slide" onRequestClose={onClose} visible={target !== null}>
        <Pressable
          accessibilityLabel={t('misc.close')}
          onPress={onClose}
          style={styles.backdrop}
          testID="boost-sheet-backdrop"
        >
          <OverlayScrim pointerEvents="none" style={styles.scrim} />
          <OverlayPanel>
            <Pressable onPress={stopPropagation} style={styles.sheet} testID="boost-sheet">
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>
                  {t('value.boost')}
                </Text>
                <HeaderBarAction
                  accessibilityLabel={t('misc.close')}
                  icon="close"
                  onPress={onClose}
                  testID="boost-sheet-close"
                />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
                <View style={styles.media}>
                  <CoverImage
                    decodeEdge={LIST_ROW_ARTWORK_SIZE}
                    opensViewer={false}
                    style={styles.artwork}
                    uri={artworkUri}
                  />
                  <View style={styles.mediaText}>
                    <Text style={styles.title}>{heading}</Text>
                    {subtitle !== null && subtitle.length > 0 ? (
                      <Text style={styles.subtitle}>{subtitle}</Text>
                    ) : null}
                  </View>
                </View>
                {tabs.length > 1 ? (
                  <View style={styles.tabs}>
                    {tabs.map((tab) => {
                      const labelKey = boostValueLabelKey(tab.key);
                      const label = labelKey !== null ? t(labelKey) : tab.key;
                      const selected = tab.key === activeKey;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          key={tab.key}
                          onPress={() => {
                            setSelectedKey(tab.key);
                          }}
                          style={[styles.tab, selected ? styles.tabSelected : null]}
                          testID={`boost-sheet-value-${tab.key}`}
                        >
                          <Text style={styles.recipient}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <View style={styles.amountRow}>
                  <TextField
                    accessibilityLabel={t('value.send_to.creator')}
                    editable={!send.submitBusy}
                    eyebrow={t('value.send_to.creator')}
                    invalid={send.amountInvalid}
                    keyboardType="decimal-pad"
                    onChangeText={send.setAmount}
                    placeholder={DEFAULT_AMOUNT}
                    testID="boost-sheet-amount"
                    value={send.amount}
                  />
                  {denominationKey !== null ? (
                    <Text style={styles.denomination}>{t(denominationKey)}</Text>
                  ) : null}
                </View>
                {send.amountInvalid ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={styles.danger}
                    testID="boost-sheet-amount-error"
                  >
                    {t('value.boost_messages.amount_input_invalid_number')}
                  </Text>
                ) : null}
                {showNameAndMessage ? (
                  <>
                    <TextField
                      accessibilityLabel={t('value.your_name')}
                      editable={send.messageEditable}
                      eyebrow={t('value.your_name')}
                      onChangeText={send.setSenderName}
                      placeholder={t('misc.anonymous')}
                      testID="boost-sheet-name"
                      value={send.senderName}
                    />
                    <TextField
                      accessibilityLabel={t('value.message')}
                      editable={send.messageEditable}
                      eyebrow={t('value.message')}
                      maxLength={
                        typeof send.messageMaxLength === 'number'
                          ? send.messageMaxLength
                          : undefined
                      }
                      multiline
                      onChangeText={send.setMessage}
                      placeholder={t('misc.optional')}
                      testID="boost-sheet-message"
                      value={send.message}
                    />
                    {send.capabilityStatus === 'loading' ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={styles.status}
                        testID="boost-sheet-capability-loading"
                      >
                        {t('value.boost_messages.mbrssV1_capability_loading_status')}
                      </Text>
                    ) : null}
                    {send.capabilityStatus === 'unavailable' ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={styles.status}
                        testID="boost-sheet-capability-unavailable"
                      >
                        {t('value.boost_messages.mbrssV1_capability_unavailable')}
                      </Text>
                    ) : null}
                    {send.capabilityStatus === 'sender_blocked' ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={styles.status}
                        testID="boost-sheet-sender-blocked"
                      >
                        {senderBlockText}
                      </Text>
                    ) : null}
                    {send.termsUrl !== null ? (
                      <Pressable
                        accessibilityLabel={termsLabel}
                        accessibilityRole="link"
                        onPress={() => {
                          const termsUrl = send.termsUrl;
                          if (termsUrl === null) {
                            return;
                          }
                          void Linking.openURL(termsUrl).catch(() => {
                            // The sheet stays open when the OS refuses the link.
                          });
                        }}
                        testID="boost-sheet-terms"
                      >
                        <Text style={styles.link}>{termsLabel}</Text>
                      </Pressable>
                    ) : null}
                    {(send.capabilityStatus === 'ready' ||
                      send.capabilityStatus === 'sender_blocked') &&
                    send.termsUrl === null ? (
                      <Text style={styles.status} testID="boost-sheet-terms-missing">
                        {t('value.meta_boost.no_terms')}
                      </Text>
                    ) : null}
                  </>
                ) : target !== null ? (
                  <Text style={styles.status} testID="boost-sheet-message-notice">
                    {t('value.boost_messages.not_enabled')}
                  </Text>
                ) : null}
                {send.albyPhase === 'not_configured' ? (
                  <Text style={styles.status} testID="boost-sheet-alby-not-configured">
                    {t('v4v.alby.not_configured')}
                  </Text>
                ) : null}
                {send.albyPhase === 'disconnected' ? (
                  <View style={styles.connect}>
                    <Button
                      fullWidth
                      label={t('v4v.alby.connect')}
                      loading={send.connectBusy}
                      onPress={send.connect}
                      size="form"
                      testID="boost-sheet-connect"
                    />
                  </View>
                ) : null}
                {send.connectFailed ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={styles.danger}
                    testID="boost-sheet-alby-error"
                  >
                    {t('v4v.alby.connect_failed')}
                  </Text>
                ) : null}
                <Text style={styles.subtitle}>
                  {t(
                    (lightningRows ?? otherRecipients).length === 1
                      ? 'value.recipient.creator_recipient'
                      : 'value.recipient.creator_recipients'
                  )}
                </Text>
                {lightningRows !== null
                  ? lightningRows.map((recipient) => {
                      const trimmedName = recipient.name?.trim() ?? '';
                      const label = trimmedName !== '' ? trimmedName : recipient.address;
                      const status = send.statuses[recipient.id];
                      const line = `${label} · ${recipient.normalizedSplit}% · ${recipient.finalAmountSats}`;
                      return (
                        <View key={recipient.id}>
                          <Text
                            style={styles.recipient}
                            testID={`boost-sheet-recipient-${recipient.id}`}
                          >
                            {line}
                          </Text>
                          {status !== undefined ? (
                            <Text
                              accessibilityLiveRegion="polite"
                              style={styles.status}
                              testID={`boost-sheet-recipient-${recipient.id}-status`}
                            >
                              {lightningStatusCopy(status, t)}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })
                  : otherRecipients.map((recipient) => {
                      const name =
                        recipient.name !== null && recipient.name.length > 0
                          ? recipient.name
                          : recipient.address;
                      const line = `${name} · ${recipient.splitPercent}% · ${recipient.amount}`;
                      return (
                        <Text key={recipient.id} style={styles.recipient}>
                          {line}
                        </Text>
                      );
                    })}
                <FormActions actions={actions} style={styles.actions} />
              </ScrollView>
            </Pressable>
          </OverlayPanel>
        </Pressable>
      </AppOverlay>
      <ConfirmDialog
        body={t('features.search.not_available_yet')}
        cancelLabel={t('misc.close')}
        cancelTestID="boost-not-available-close"
        onCancel={send.dismissNotAvailable}
        testID="boost-not-available"
        title={t('value.boost')}
        visible={send.notAvailableVisible}
      />
      <ConfirmDialog
        body={shownNotice?.body ?? ''}
        cancelLabel={shownNotice?.button ?? t('misc.ok')}
        cancelTestID="boost-sheet-notice-close"
        onCancel={send.dismissNotice}
        testID="boost-sheet-notice"
        title={shownNotice?.title ?? t('value.boost')}
        visible={send.notice !== null}
      />
    </>
  );
}
