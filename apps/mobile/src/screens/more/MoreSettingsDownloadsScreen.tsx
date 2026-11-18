import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { SettingsRowDescription, SettingsSwitchRow } from '../../components/form';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { ProgressTrack } from '../../components/primitives/ProgressTrack';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
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
  readChosenDownloadFolderSwitch,
  writeAutoDownloadCellularDefaultEnabled,
  writeAutoDownloadDefaultEnabled,
  writeChosenDownloadFolderEnabled,
  writeDownloadAutoDeleteOnDeviceLowEnabled,
  writeDownloadAutoDeleteOnLimitEnabled,
} from '../../prefs/downloadPrefs';
import { settingsCardGap, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type StorageMeterProps = {
  label: string;
  usedLabel: string;
  /** 0–1 fill when this bucket has a real cap. Omit the track when there is no upper bound. */
  ratio?: number;
  testID?: string;
};

function StorageMeter({ label, usedLabel, ratio, testID }: StorageMeterProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginBottom: tokens.spacing.xs,
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
    <View testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} testID={testID === undefined ? undefined : `${testID}-value`}>
        {usedLabel}
      </Text>
      {ratio !== undefined ? (
        <ProgressTrack
          fillTestID={testID === undefined ? undefined : `${testID}-fill`}
          height={6}
          ratio={ratio}
          testID={testID === undefined ? undefined : `${testID}-track`}
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
  const [chosenFolder, setChosenFolder] = useState({ enabled: false, visible: false });
  const [chosenFolderError, setChosenFolderError] = useState<string | null>(null);
  const chosenFolderWriteInFlightRef = useRef(false);

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
    void readChosenDownloadFolderSwitch()
      .then((next) => {
        setChosenFolder(next);
      })
      .catch(() => {
        // A failed read leaves the switch hidden.
      });
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
        cardHeading: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
        },
        cardStack: {
          gap: settingsCardGap(tokens.spacing),
        },
        catchUp: {
          gap: tokens.spacing.xs,
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
        },
        chosenFolderError: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
        },
        packedCard: {
          gap: settingsCardInnerGap(tokens.spacing),
          padding: tokens.spacing.lg,
        },
        sectionDescription: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        sectionHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
        },
        storageBlock: {
          position: 'relative',
        },
        storageMeters: {
          gap: settingsCardInnerGap(tokens.spacing),
        },
        storagePending: {
          opacity: 0,
        },
        storageSpinner: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
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

  const commitAutoDownloadDefault = useCallback(async (next: boolean, applyToExisting: boolean) => {
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
  }, []);

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

  const handleChosenFolderChange = useCallback(
    (next: boolean) => {
      if (chosenFolderWriteInFlightRef.current) {
        return;
      }
      chosenFolderWriteInFlightRef.current = true;
      void writeChosenDownloadFolderEnabled(next)
        .then(() => {
          setChosenFolder((current) => ({ enabled: next, visible: current.visible }));
          setChosenFolderError(null);
        })
        .catch(() => {
          setChosenFolderError(t('settings.downloads.chosen_folder_save_failed'));
        })
        .finally(() => {
          chosenFolderWriteInFlightRef.current = false;
        });
    },
    [t]
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
  const storagePending = breakdown === null;
  const storagePlaceholder = '\u00a0';
  const deviceMeterRatio =
    storagePending || deviceRatio !== undefined ? (deviceRatio ?? 0) : undefined;
  const mediaMeterRatio = storagePending || mediaHasCap ? (limitRatio ?? 0) : undefined;
  const deviceUsedLabel =
    breakdown === null
      ? storagePlaceholder
      : `${formatDownloadBytes(breakdown.deviceUsedBytes)} / ${formatDownloadBytes(
          breakdown.deviceTotalBytes
        )}`;
  const mediaUsedLabel =
    breakdown === null
      ? storagePlaceholder
      : `${formatDownloadBytes(breakdown.downloadsBytes)} / ${quotaLabel}`;
  const appDataUsedLabel =
    breakdown === null ? storagePlaceholder : formatDownloadBytes(breakdown.appDataBytes);
  const cacheUsedLabel =
    breakdown === null ? storagePlaceholder : formatDownloadBytes(breakdown.cacheBytes);

  return (
    <MobileScreenContainer testID="more-settings-downloads-screen">
      <View style={styles.cardStack}>
        <Card padded={false} testID="more-settings-downloads-storage-card">
          <View style={styles.packedCard}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.storage_heading')}</Text>
            <View style={styles.storageBlock}>
              <View
                accessibilityElementsHidden={storagePending}
                importantForAccessibility={storagePending ? 'no-hide-descendants' : 'auto'}
                pointerEvents={storagePending ? 'none' : 'auto'}
                style={storagePending ? styles.storagePending : undefined}
              >
                <View style={styles.storageMeters}>
                  <StorageMeter
                    label={t('settings.downloads.device_storage')}
                    ratio={deviceMeterRatio}
                    testID={storagePending ? undefined : 'settings-downloads-device'}
                    usedLabel={deviceUsedLabel}
                  />
                  <StorageMeter
                    label={t('settings.downloads.downloaded_media')}
                    ratio={mediaMeterRatio}
                    testID={storagePending ? undefined : 'settings-downloads-media'}
                    usedLabel={mediaUsedLabel}
                  />
                  <StorageMeter
                    label={t('settings.downloads.app_data')}
                    testID={storagePending ? undefined : 'settings-downloads-app-data'}
                    usedLabel={appDataUsedLabel}
                  />
                  <StorageMeter
                    label={t('settings.downloads.cache')}
                    testID={storagePending ? undefined : 'settings-downloads-cache'}
                    usedLabel={cacheUsedLabel}
                  />
                </View>
              </View>
              {storagePending ? (
                <View style={styles.storageSpinner} testID="settings-downloads-storage-loading">
                  <ActivityIndicator
                    accessibilityLabel={t('misc.loading')}
                    color={themeStyles.buttonPrimary.backgroundColor}
                  />
                </View>
              ) : null}
            </View>
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

        {chosenFolder.visible ? (
          <Card padded={false} testID="more-settings-downloads-chosen-folder">
            <SettingsSwitchRow
              onValueChange={handleChosenFolderChange}
              switchTestID="more-settings-downloads-chosen-folder-switch"
              testID="more-settings-downloads-chosen-folder-row"
              title={t('settings.downloads.chosen_folder')}
              value={chosenFolder.enabled}
            >
              <SettingsRowDescription>
                {t('settings.downloads.chosen_folder_description')}
              </SettingsRowDescription>
            </SettingsSwitchRow>
            {chosenFolderError !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.chosenFolderError}
                testID="more-settings-downloads-chosen-folder-error"
              >
                {chosenFolderError}
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card padded={false} testID="more-settings-downloads-auto-download-card">
          <Text style={[styles.sectionHeading, styles.cardHeading]}>
            {t('settings.downloads.auto_download_heading')}
          </Text>
          <SettingsSwitchRow
            onValueChange={(next) => {
              void handleAutoDownloadDefaultToggle(next);
            }}
            switchTestID="more-settings-downloads-auto-download-default-switch"
            testID="more-settings-downloads-auto-download-default"
            title={t('settings.downloads.auto_download_default')}
            value={autoDownloadDefault}
          >
            <SettingsRowDescription>
              {t('settings.downloads.auto_download_default_description')}
            </SettingsRowDescription>
          </SettingsSwitchRow>
          <SettingsSwitchRow
            onValueChange={(next) => {
              void handleCellularDefaultToggle(next);
            }}
            switchTestID="more-settings-downloads-cellular-default-switch"
            testID="more-settings-downloads-cellular-default"
            title={t('settings.downloads.auto_download_cellular_default')}
            value={cellularDefault}
          >
            <SettingsRowDescription>
              {t('settings.downloads.auto_download_cellular_default_description')}
            </SettingsRowDescription>
          </SettingsSwitchRow>
          <View style={styles.catchUp}>
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
            <SettingsRowDescription>
              {t('settings.downloads.auto_download_catch_up_description')}
            </SettingsRowDescription>
          </View>
        </Card>

        <Card padded={false} testID="more-settings-downloads-auto-free-card">
          <Text style={[styles.sectionHeading, styles.cardHeading]}>
            {t('settings.downloads.auto_free_heading')}
          </Text>
          <SettingsSwitchRow
            onValueChange={(next) => {
              void writeDownloadAutoDeleteOnLimitEnabled(next).then(() => storage.reload());
            }}
            testID="more-settings-downloads-auto-limit"
            title={t('settings.downloads.auto_delete_on_limit')}
            value={storage.autoDeleteOnLimitEnabled}
          >
            <SettingsRowDescription>
              {t('settings.downloads.auto_delete_on_limit_description')}
            </SettingsRowDescription>
          </SettingsSwitchRow>
          <SettingsSwitchRow
            onValueChange={(next) => {
              void writeDownloadAutoDeleteOnDeviceLowEnabled(next).then(() => storage.reload());
            }}
            testID="more-settings-downloads-auto-device-low"
            title={t('settings.downloads.auto_delete_on_device_low')}
            value={storage.autoDeleteOnDeviceLowEnabled}
          >
            <SettingsRowDescription>
              {t('settings.downloads.auto_delete_on_device_low_description')}
            </SettingsRowDescription>
          </SettingsSwitchRow>
        </Card>

        <Card padded={false} testID="more-settings-downloads-delete-all-card">
          <View style={styles.packedCard}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.delete_all_heading')}</Text>
            <Text style={styles.sectionDescription}>
              {t('settings.downloads.delete_all_description')}
            </Text>
            <Button
              fullWidth
              label={t('settings.downloads.delete_all')}
              onPress={() => {
                setConfirmVisible(true);
              }}
              size="form"
              testID="more-settings-downloads-delete-all"
              variant="danger"
            />
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
