import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { primaryListArtworkUrl } from '@podverse/helpers';

import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
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
  shouldShowBoostMessageFields,
} from './boostFormModel';

export type BoostSheetTarget = {
  channel: DTOChannel;
  item: DTOItem | null;
};

type BoostSheetProps = {
  onClose: () => void;
  target: BoostSheetTarget | null;
};

const DEFAULT_AMOUNT = '1';

/**
 * Creator boost form in a bottom sheet. Submit does not send a payment; it acknowledges that
 * sending is not available yet and leaves the form as the user left it.
 */
export function BoostSheet({ onClose, target }: BoostSheetProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedKey, setSelectedKey] = useState('');
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [notAvailableVisible, setNotAvailableVisible] = useState(false);

  const channelId = target?.channel.id_text ?? '';
  const itemId = target?.item?.id_text ?? '';

  useEffect(() => {
    setSelectedKey('');
    setAmount(DEFAULT_AMOUNT);
    setSenderName('');
    setMessage('');
    setNotAvailableVisible(false);
  }, [channelId, itemId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          justifyContent: 'flex-end',
          marginTop: tokens.spacing.lg,
        },
        amountRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        backdrop: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        denomination: {
          color: themeStyles.textSecondary.color,
        },
        header: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
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
          ...StyleSheet.absoluteFillObject,
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
  const parsedAmount = Number(amount);
  const totalAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const recipients = boostRecipientsForTab(activeTab, totalAmount);
  const showMessages =
    activeTab !== null &&
    shouldShowBoostMessageFields(activeTab.key, recipientTypesForTab(activeTab));
  const denominationKey =
    activeTab === null ? null : boostValueDenominationKey(activeTab.key);
  const artworkUri =
    target === null
      ? null
      : primaryListArtworkUrl(
          target.item?.item_images,
          target.channel.channel_images
        );
  const heading =
    target === null
      ? ''
      : target.item !== null
        ? (target.item.title ?? target.channel.title)
        : target.channel.title;
  const subtitle = target?.item !== null && target !== null ? target.channel.title : null;

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
                    opensViewer={false}
                    style={{ height: 56, width: 56 }}
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
                    eyebrow={t('value.send_to.creator')}
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                    placeholder={DEFAULT_AMOUNT}
                    testID="boost-sheet-amount"
                    value={amount}
                  />
                  {denominationKey !== null ? (
                    <Text style={styles.denomination}>{t(denominationKey)}</Text>
                  ) : null}
                </View>
                {showMessages ? (
                  <>
                    <TextField
                      accessibilityLabel={t('value.your_name')}
                      eyebrow={t('value.your_name')}
                      onChangeText={setSenderName}
                      placeholder={t('misc.anonymous')}
                      testID="boost-sheet-name"
                      value={senderName}
                    />
                    <TextField
                      accessibilityLabel={t('value.message')}
                      eyebrow={t('value.message')}
                      multiline
                      onChangeText={setMessage}
                      placeholder={t('misc.optional')}
                      testID="boost-sheet-message"
                      value={message}
                    />
                  </>
                ) : null}
                <Text style={styles.subtitle}>
                  {t(
                    recipients.length === 1
                      ? 'value.recipient.creator_recipient'
                      : 'value.recipient.creator_recipients'
                  )}
                </Text>
                {recipients.map((recipient) => (
                  <Text key={recipient.id} style={styles.recipient}>
                    {`${recipient.name !== null && recipient.name.length > 0 ? recipient.name : recipient.address} · ${recipient.splitPercent}% · ${recipient.amount}`}
                  </Text>
                ))}
                <View style={styles.actions}>
                  <Button
                    label={t('misc.cancel')}
                    onPress={onClose}
                    testID="boost-sheet-cancel"
                    variant="secondary"
                  />
                  <Button
                    label={t('misc.submit')}
                    onPress={() => {
                      setNotAvailableVisible(true);
                    }}
                    testID="boost-sheet-submit"
                    variant="primary"
                  />
                </View>
              </ScrollView>
            </Pressable>
          </OverlayPanel>
        </Pressable>
      </AppOverlay>
      <ConfirmDialog
        body={t('features.search.not_available_yet')}
        cancelLabel={t('misc.close')}
        cancelTestID="boost-not-available-close"
        onCancel={() => {
          setNotAvailableVisible(false);
        }}
        testID="boost-not-available"
        title={t('value.boost')}
        visible={notAvailableVisible}
      />
    </>
  );
}
