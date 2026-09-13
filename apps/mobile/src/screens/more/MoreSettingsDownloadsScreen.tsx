import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { ProgressTrack } from '../../components/primitives/ProgressTrack';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { downloadManager } from '../../downloads/downloadManager';
import { formatDownloadBytes } from '../../downloads/downloadQuota';
import {
  measureDownloadStorageBreakdown,
  type DownloadStorageBreakdown,
} from '../../downloads/downloadStorageStats';
import { useDownloadStorage } from '../../downloads/useDownloads';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import {
  isDownloadQuotaUnlimited,
  writeDownloadAutoDeleteOnDeviceLowEnabled,
  writeDownloadAutoDeleteOnLimitEnabled,
} from '../../prefs/downloadPrefs';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const emptyBreakdown = (): DownloadStorageBreakdown => ({
  appDataBytes: 0,
  cacheBytes: 0,
  deviceTotalBytes: 0,
  deviceUsedBytes: 0,
  downloadsBytes: 0,
});

type StorageMeterProps = {
  label: string;
  usedLabel: string;
  ratio: number;
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
      <ProgressTrack
        fillTestID={`${testID}-fill`}
        height={6}
        ratio={ratio}
      />
    </View>
  );
}

export function MoreSettingsDownloadsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { styles: themeStyles, tokens } = useTheme();
  const storage = useDownloadStorage();
  const [breakdown, setBreakdown] = useState<DownloadStorageBreakdown>(emptyBreakdown);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const reloadBreakdown = useCallback(async () => {
    const next = await measureDownloadStorageBreakdown();
    setBreakdown(next);
  }, []);

  useEffect(() => {
    void reloadBreakdown();
    const unsubscribe = downloadManager.subscribe(() => {
      void reloadBreakdown();
    });
    return unsubscribe;
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

  const quotaLabel = isDownloadQuotaUnlimited(storage.quotaBytes)
    ? t('settings.downloads.unlimited')
    : formatDownloadBytes(storage.quotaBytes);

  const limitRatio =
    isDownloadQuotaUnlimited(storage.quotaBytes) || storage.quotaBytes <= 0
      ? 0
      : Math.min(1, breakdown.downloadsBytes / storage.quotaBytes);

  const deviceRatio =
    breakdown.deviceTotalBytes > 0
      ? Math.min(1, breakdown.deviceUsedBytes / breakdown.deviceTotalBytes)
      : 0;

  // App data / cache have no fixed cap — show a full bar only as presence (0 when empty).
  const appDataRatio = breakdown.appDataBytes > 0 ? 1 : 0;
  const cacheRatio = breakdown.cacheBytes > 0 ? 1 : 0;

  return (
    <MobileScreenContainer testID="more-settings-downloads-screen">
      <View style={styles.cardStack}>
        <Card padded={false} testID="more-settings-downloads-storage-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.storage_heading')}</Text>
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
              ratio={appDataRatio}
              testID="settings-downloads-app-data"
              usedLabel={formatDownloadBytes(breakdown.appDataBytes)}
            />
            <StorageMeter
              label={t('settings.downloads.cache')}
              ratio={cacheRatio}
              testID="settings-downloads-cache"
              usedLabel={formatDownloadBytes(breakdown.cacheBytes)}
            />
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

        <Card padded={false} testID="more-settings-downloads-auto-free-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.downloads.auto_free_heading')}</Text>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-downloads-auto-limit"
                title={t('settings.downloads.auto_delete_on_limit')}
                trailing={
                  <Switch
                    onValueChange={(next) => {
                      void writeDownloadAutoDeleteOnLimitEnabled(next).then(() =>
                        storage.reload()
                      );
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
                  <Switch
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
    </MobileScreenContainer>
  );
}
