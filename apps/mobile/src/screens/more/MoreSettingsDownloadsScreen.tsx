import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { ProgressTrack } from '../../components/primitives/ProgressTrack';
import { ToggleSwitch } from '../../components/primitives/ToggleSwitch';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListLoading } from '../../components/state/ListLoading';
import { autoDownloadRepository } from '../../data/repositories/autoDownloadRepository';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT } from '../../downloads/autoDownloadPlanner';
import { syncAutoDownloadRegistrationNow } from '../../downloads/autoDownloadRegistrationSync';
import { downloadManager } from '../../downloads/downloadManager';
import { formatDownloadBytes } from '../../downloads/downloadQuota';
import {
  type DownloadStorageBreakdown,
  measureDownloadStorageBreakdown,
} from '../../downloads/downloadStorageStats';
import { downloadStore } from '../../downloads/downloadStore';
import { useDownloadStorage } from '../../downloads/useDownloads';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import {
  isDownloadQuotaUnlimited,
  readAutoDownloadCatchUpLimit,
  readAutoDownloadCellularDefaultEnabled,
  readAutoDownloadDefaultEnabled,
  writeAutoDownloadCellularDefaultEnabled,
  writeAutoDownloadDefaultEnabled,
  writeDownloadAutoDeleteOnDeviceLowEnabled,
  writeDownloadAutoDeleteOnLimitEnabled,
} from '../../prefs/downloadPrefs';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type StorageMeterProps = {
  label: string;
  usedLabel: string;
  /** 0–1 fill when this bucket has a real cap. Omit the track when there is no upper bound. */
  ratio?: number;
  testID: string;
};

function StorageMeter({ label, usedLabel, ratio, testID }: StorageMeterProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          ...typography.label,
          color: themeStyles.textSecondary.color,
          marginBottom: tokens.spacing.xs,
        },
        meter: {
          marginBottom: tokens.spacing.lg,
        },
        value: {
          ...typography.title,
          color: themeStyles.textPrimary.color,
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.meter} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} testID={`${testID}-value`}>
        {usedLabel}
      </Text>
      {ratio !== undefined ? (
        <ProgressTrack
          fillTestID={`${testID}-fill`}
          height={6}
          ratio={ratio}
          testID={`${testID}-track`}
        />
      ) : null}
    </View>
  );
}

type ApplyDialogKind = 'auto_download' | 'cellular' | null;

export function MoreSettingsDownloadsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { styles: themeStyles, tokens } = useTheme();
  const storage = useDownloadStorage();
  const { evaluateFeature } = useAccessTier();
  const { openGate } = useMembershipGate();
  const [breakdown, setBreakdown] = useState<DownloadStorageBreakdown | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [autoDownloadDefault, setAutoDownloadDefault] = useState(false);
  const [cellularDefault, setCellularDefault] = useState(false);
  const [catchUpLimit, setCatchUpLimit] = useState(DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT);
  const [applyDialog, setApplyDialog] = useState<ApplyDialogKind>(null);
  const [pendingDefault, setPendingDefault] = useState<boolean | null>(null);
  const [affectedCount, setAffectedCount] = useState(0);

  const reloadBreakdown = useCallback(async () => {
    const next = await measureDownloadStorageBreakdown();
    setBreakdown(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const [autoDefault, cellDefault] = await Promise.all([
        readAutoDownloadDefaultEnabled(),
        readAutoDownloadCellularDefaultEnabled(),
      ]);
      setAutoDownloadDefault(autoDefault);
      setCellularDefault(cellDefault);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void readAutoDownloadCatchUpLimit().then(setCatchUpLimit);
    }, [])
  );

  // Measuring the buckets walks the filesystem, so it reads the status channel only, and a burst of
  // completions or deletions coalesces into one walk.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    void reloadBreakdown();

    const unsubscribe = downloadStore.subscribe(() => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        void reloadBreakdown();
      }, 400);
    });

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [reloadBreakdown]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardStack: {
          gap: tokens.spacing.xl,
        },
        sectionDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        sectionHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: tokens.spacing.xs,
        },
        sectionInner: {
          padding: tokens.spacing.lg,
        },
        sectionStack: {
          marginTop: tokens.spacing.md,
        },
        toggleDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
          paddingRight: tokens.spacing['3xl'],
        },
      }),
    [themeStyles, tokens]
  );

  const requireAutoDownloadAccess = useCallback((): boolean => {
    const access = evaluateFeature('auto_download');
    if (!access.allowed) {
      openGate(access.reason);
      return false;
    }
    return true;
  }, [evaluateFeature, openGate]);

  const commitAutoDownloadDefault = useCallback(
    async (next: boolean, applyToExisting: boolean) => {
      await writeAutoDownloadDefaultEnabled(next);
      setAutoDownloadDefault(next);
      if (applyToExisting) {
        const subscribed = await subscriptionsRepository.list();
        const cellular = await readAutoDownloadCellularDefaultEnabled();
        await autoDownloadRepository.applyEnabledToAllSubscribed({
          allowCellular: cellular,
          channelIdTexts: subscribed.map((row) => row.idText),
          enabled: next,
        });
        void syncAutoDownloadRegistrationNow();
      }
    },
    []
  );

  const commitCellularDefault = useCallback(async (next: boolean, applyToExisting: boolean) => {
    await writeAutoDownloadCellularDefaultEnabled(next);
    setCellularDefault(next);
    if (applyToExisting) {
      const enabled = await autoDownloadRepository.listEnabled();
      await autoDownloadRepository.applyCellularToEnabled({
        allowCellular: next,
        channelIdTexts: enabled.map((row) => row.channelIdText),
      });
    }
  }, []);

  const handleAutoDownloadDefaultToggle = useCallback(
    async (next: boolean) => {
      if (!requireAutoDownloadAccess()) {
        return;
      }
      const subscribed = await subscriptionsRepository.list();
      if (subscribed.length === 0) {
        await commitAutoDownloadDefault(next, false);
        return;
      }
      setPendingDefault(next);
      setAffectedCount(subscribed.length);
      setApplyDialog('auto_download');
    },
    [commitAutoDownloadDefault, requireAutoDownloadAccess]
  );

  const handleCellularDefaultToggle = useCallback(
    async (next: boolean) => {
      if (!requireAutoDownloadAccess()) {
        return;
      }
      const enabled = await autoDownloadRepository.listEnabled();
      if (enabled.length === 0) {
        await commitCellularDefault(next, false);
        return;
      }
      setPendingDefault(next);
      setAffectedCount(enabled.length);
      setApplyDialog('cellular');
    },
    [commitCellularDefault, requireAutoDownloadAccess]
  );

  const quotaLabel = isDownloadQuotaUnlimited(storage.quotaBytes)
    ? t('settings.downloads.unlimited')
    : formatDownloadBytes(storage.quotaBytes);

  const mediaHasCap = !isDownloadQuotaUnlimited(storage.quotaBytes) && storage.quotaBytes > 0;
  const limitRatio = mediaHasCap
    ? Math.min(1, (breakdown?.downloadsBytes ?? 0) / storage.quotaBytes)
    : undefined;

  const deviceRatio =
    breakdown !== null && breakdown.deviceTotalBytes > 0
      ? Math.min(1, breakdown.deviceUsedBytes / breakdown.deviceTotalBytes)
      : undefined;

  return (
    <MobileScreenContainer testID="more-settings-downloads-screen">
      <View style={styles.cardStack}>
        <Card padded={false} testID="more-settings-downloads-storage-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.storage_heading')}</Text>
            {breakdown === null ? (
              <ListLoading testID="settings-downloads-storage-loading" />
            ) : (
              <>
                <StorageMeter
                  label={t('settings.downloads.device_storage')}
                  ratio={deviceRatio}
                  testID="settings-downloads-device"
                  usedLabel={`${formatDownloadBytes(breakdown.deviceUsedBytes)} / ${formatDownloadBytes(breakdown.deviceTotalBytes)}`}
                />
                <StorageMeter
                  label={t('settings.downloads.downloaded_media')}
                  ratio={limitRatio}
                  testID="settings-downloads-media"
                  usedLabel={`${formatDownloadBytes(breakdown.downloadsBytes)} / ${quotaLabel}`}
                />
                <StorageMeter
                  label={t('settings.downloads.app_data')}
                  testID="settings-downloads-app-data"
                  usedLabel={formatDownloadBytes(breakdown.appDataBytes)}
                />
                <StorageMeter
                  label={t('settings.downloads.cache')}
                  testID="settings-downloads-cache"
                  usedLabel={formatDownloadBytes(breakdown.cacheBytes)}
                />
              </>
            )}
            <ListRow
              onPress={() => {
                navigation.navigate(MORE_STACK_ROUTES.MoreSettingsDownloadLimit);
              }}
              subtitle={quotaLabel}
              testID="more-settings-downloads-limit"
              title={t('settings.downloads.limit_label')}
            />
          </View>
        </Card>

        <Card padded={false} testID="more-settings-downloads-auto-download-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.auto_download_heading')}</Text>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-downloads-auto-download-default"
                title={t('settings.downloads.auto_download_default')}
                trailing={
                  <ToggleSwitch
                    accessibilityLabel={t('settings.downloads.auto_download_default')}
                    onValueChange={(next) => {
                      void handleAutoDownloadDefaultToggle(next);
                    }}
                    testID="more-settings-downloads-auto-download-default-switch"
                    value={autoDownloadDefault}
                  />
                }
              />
              <Text style={styles.toggleDescription}>
                {t('settings.downloads.auto_download_default_description')}
              </Text>
            </View>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-downloads-cellular-default"
                title={t('settings.downloads.auto_download_cellular_default')}
                trailing={
                  <ToggleSwitch
                    accessibilityLabel={t('settings.downloads.auto_download_cellular_default')}
                    onValueChange={(next) => {
                      void handleCellularDefaultToggle(next);
                    }}
                    testID="more-settings-downloads-cellular-default-switch"
                    value={cellularDefault}
                  />
                }
              />
              <Text style={styles.toggleDescription}>
                {t('settings.downloads.auto_download_cellular_default_description')}
              </Text>
            </View>
            <View style={styles.sectionStack}>
              <ListRow
                onPress={() => {
                  navigation.navigate(MORE_STACK_ROUTES.MoreSettingsAutoDownloadCatchUp);
                }}
                subtitle={t('settings.downloads.auto_download_catch_up_count', {
                  count: catchUpLimit,
                })}
                testID="more-settings-downloads-catch-up-limit"
                title={t('settings.downloads.auto_download_catch_up_label')}
              />
              <Text style={styles.toggleDescription}>
                {t('settings.downloads.auto_download_catch_up_description')}
              </Text>
            </View>
          </View>
        </Card>

        <Card padded={false} testID="more-settings-downloads-auto-free-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.auto_free_heading')}</Text>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-downloads-auto-limit"
                title={t('settings.downloads.auto_delete_on_limit')}
                trailing={
                  <ToggleSwitch
                    onValueChange={(next) => {
                      void writeDownloadAutoDeleteOnLimitEnabled(next).then(() => storage.reload());
                    }}
                    value={storage.autoDeleteOnLimitEnabled}
                  />
                }
              />
              <Text style={styles.toggleDescription}>
                {t('settings.downloads.auto_delete_on_limit_description')}
              </Text>
            </View>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-downloads-auto-device-low"
                title={t('settings.downloads.auto_delete_on_device_low')}
                trailing={
                  <ToggleSwitch
                    onValueChange={(next) => {
                      void writeDownloadAutoDeleteOnDeviceLowEnabled(next).then(() =>
                        storage.reload()
                      );
                    }}
                    value={storage.autoDeleteOnDeviceLowEnabled}
                  />
                }
              />
              <Text style={styles.toggleDescription}>
                {t('settings.downloads.auto_delete_on_device_low_description')}
              </Text>
            </View>
          </View>
        </Card>

        <Card padded={false} testID="more-settings-downloads-delete-all-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.delete_all_heading')}</Text>
            <Text style={styles.sectionDescription}>
              {t('settings.downloads.delete_all_description')}
            </Text>
            <View style={styles.sectionStack}>
              <Button
                fullWidth
                label={t('settings.downloads.delete_all')}
                onPress={() => {
                  setConfirmVisible(true);
                }}
                testID="more-settings-downloads-delete-all"
                variant="danger"
              />
            </View>
          </View>
        </Card>
      </View>

      <ConfirmDialog
        body={t('settings.downloads.delete_all_confirm_body')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="more-settings-downloads-delete-all-cancel"
        confirmLabel={t('settings.downloads.delete_all')}
        confirmTestID="more-settings-downloads-delete-all-confirm"
        onCancel={() => {
          setConfirmVisible(false);
        }}
        onConfirm={() => {
          setConfirmVisible(false);
          void downloadManager.removeAll();
        }}
        testID="more-settings-downloads-delete-all-dialog"
        title={t('settings.downloads.delete_all_confirm_title')}
        visible={confirmVisible}
      />

      <ConfirmDialog
        body={
          applyDialog === 'cellular'
            ? t('settings.downloads.auto_download_cellular_apply_body', { count: affectedCount })
            : t('settings.downloads.auto_download_apply_body', { count: affectedCount })
        }
        cancelLabel={t('settings.downloads.auto_download_apply_new_only')}
        cancelTestID="more-settings-downloads-apply-new-only"
        confirmLabel={t('settings.downloads.auto_download_apply_all')}
        confirmTestID="more-settings-downloads-apply-all"
        onCancel={() => {
          const next = pendingDefault;
          const kind = applyDialog;
          setApplyDialog(null);
          setPendingDefault(null);
          if (next === null || kind === null) {
            return;
          }
          if (kind === 'auto_download') {
            void commitAutoDownloadDefault(next, false);
          } else {
            void commitCellularDefault(next, false);
          }
        }}
        onConfirm={() => {
          const next = pendingDefault;
          const kind = applyDialog;
          setApplyDialog(null);
          setPendingDefault(null);
          if (next === null || kind === null) {
            return;
          }
          if (kind === 'auto_download') {
            void commitAutoDownloadDefault(next, true);
          } else {
            void commitCellularDefault(next, true);
          }
        }}
        testID="more-settings-downloads-apply-dialog"
        title={
          applyDialog === 'cellular'
            ? t('settings.downloads.auto_download_cellular_apply_title')
            : t('settings.downloads.auto_download_apply_title')
        }
        visible={applyDialog !== null}
      />
    </MobileScreenContainer>
  );
}
