import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OptionListScreen } from '../../components/form';
import type { MoreStackParamList } from '../../navigation';
import {
  DOWNLOAD_QUOTA_PRESET_BYTES,
  DOWNLOAD_QUOTA_UNLIMITED,
  readDownloadQuotaBytes,
  writeDownloadQuotaBytes,
} from '../../prefs/downloadPrefs';
import { formatDownloadBytes } from '../../downloads/downloadQuota';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreSettingsDownloadLimit'>;

type QuotaOptionId =
  | '1gb'
  | '2gb'
  | '5gb'
  | '10gb'
  | '20gb'
  | '50gb'
  | 'unlimited';

const PRESET_IDS: readonly QuotaOptionId[] = [
  '1gb',
  '2gb',
  '5gb',
  '10gb',
  '20gb',
  '50gb',
  'unlimited',
];

const bytesForOption = (id: QuotaOptionId): number => {
  if (id === 'unlimited') {
    return DOWNLOAD_QUOTA_UNLIMITED;
  }
  const index = PRESET_IDS.indexOf(id);
  const preset = DOWNLOAD_QUOTA_PRESET_BYTES[index];
  return preset ?? DOWNLOAD_QUOTA_UNLIMITED;
};

const optionForBytes = (bytes: number): QuotaOptionId => {
  if (bytes === DOWNLOAD_QUOTA_UNLIMITED) {
    return 'unlimited';
  }
  const index = DOWNLOAD_QUOTA_PRESET_BYTES.indexOf(bytes);
  if (index >= 0) {
    return PRESET_IDS[index] ?? '10gb';
  }
  return '10gb';
};

export function MoreSettingsDownloadLimitScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState<QuotaOptionId>('10gb');

  useEffect(() => {
    void (async () => {
      const bytes = await readDownloadQuotaBytes();
      setValue(optionForBytes(bytes));
    })();
  }, []);

  const options = useMemo(
    () =>
      PRESET_IDS.map((id) => ({
        label:
          id === 'unlimited'
            ? t('settings.downloads.unlimited')
            : formatDownloadBytes(bytesForOption(id)),
        testID: `more-settings-download-limit-${id}`,
        value: id,
      })),
    [t]
  );

  const handleSelect = useCallback(
    (id: QuotaOptionId) => {
      void (async () => {
        await writeDownloadQuotaBytes(bytesForOption(id));
        setValue(id);
        navigation.goBack();
      })();
    },
    [navigation]
  );

  return (
    <OptionListScreen
      onSelect={handleSelect}
      options={options}
      testID="more-settings-download-limit-screen"
      value={value}
    />
  );
}
