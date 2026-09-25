import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OptionListScreen } from '../../components/form';
import type { AutoDownloadCatchUpLimit } from '../../downloads/autoDownloadPlanner';
import {
  AUTO_DOWNLOAD_CATCH_UP_LIMIT_PRESETS,
  DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT,
} from '../../downloads/autoDownloadPlanner';
import type { MoreStackParamList } from '../../navigation';
import {
  readAutoDownloadCatchUpLimit,
  writeAutoDownloadCatchUpLimit,
} from '../../prefs/downloadPrefs';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreSettingsAutoDownloadCatchUp'>;

const CATCH_UP_OPTION_IDS = ['10', '20', '50'] as const;

type CatchUpOptionId = (typeof CATCH_UP_OPTION_IDS)[number];

const isCatchUpOptionId = (value: string): value is CatchUpOptionId => {
  return CATCH_UP_OPTION_IDS.some((id) => id === value);
};

const optionIdForLimit = (limit: AutoDownloadCatchUpLimit): CatchUpOptionId => {
  const id = String(limit);
  if (isCatchUpOptionId(id)) {
    return id;
  }
  return '20';
};

const limitForOption = (id: CatchUpOptionId): AutoDownloadCatchUpLimit => {
  const match = AUTO_DOWNLOAD_CATCH_UP_LIMIT_PRESETS.find((preset) => String(preset) === id);
  return match ?? DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT;
};

export function MoreSettingsAutoDownloadCatchUpScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState<CatchUpOptionId>('20');

  useEffect(() => {
    void (async () => {
      const limit = await readAutoDownloadCatchUpLimit();
      setValue(optionIdForLimit(limit));
    })();
  }, []);

  const options = useMemo(
    () =>
      CATCH_UP_OPTION_IDS.map((id) => ({
        label: t('settings.downloads.auto_download_catch_up_count', {
          count: limitForOption(id),
        }),
        testID: `more-settings-auto-download-catch-up-${id}`,
        value: id,
      })),
    [t]
  );

  const handleSelect = useCallback(
    (id: CatchUpOptionId) => {
      void (async () => {
        await writeAutoDownloadCatchUpLimit(limitForOption(id));
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
      testID="more-settings-auto-download-catch-up-screen"
      value={value}
    />
  );
}
