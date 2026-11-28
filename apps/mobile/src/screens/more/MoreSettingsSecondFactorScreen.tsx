import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text } from 'react-native';

import { createMobileApiRequestService } from '../../auth';
import { FormActions, TextField } from '../../components/form';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';

export function MoreSettingsSecondFactorScreen() {
  const { t } = useTranslation();
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const begin = async () => {
    const api = createMobileApiRequestService();
    if (api === null) {
      return;
    }
    const started = await api.reqAuthSecondFactorEnroll();
    setManualKey(typeof started.manualKey === 'string' ? started.manualKey : null);
    setQrDataUrl(typeof started.qrDataUrl === 'string' ? started.qrDataUrl : null);
  };

  const confirm = async () => {
    const api = createMobileApiRequestService();
    if (api === null) {
      return;
    }
    const confirmed = await api.reqAuthSecondFactorEnrollConfirm({ code });
    setBackupCodes(confirmed.backupCodes ?? null);
    setManualKey(null);
  };

  return (
    <MobileScreenContainer testID="second-factor-settings">
      <Text>{t('authentication.second_factor_setup_help')}</Text>
      {qrDataUrl !== null ? (
        <Image accessibilityIgnoresInvertColors source={{ uri: qrDataUrl }} />
      ) : null}
      {manualKey !== null ? <Text testID="second-factor-manual-key">{manualKey}</Text> : null}
      {backupCodes !== null ? (
        <Text testID="second-factor-backup-codes">{backupCodes.join('\n')}</Text>
      ) : null}
      {manualKey !== null ? (
        <TextField
          accessibilityLabel={t('authentication.second_factor_code')}
          eyebrow={t('authentication.second_factor_code')}
          onChangeText={setCode}
          placeholder={t('authentication.second_factor_code_help')}
          testID="second-factor-code"
          value={code}
        />
      ) : null}
      <FormActions
        actions={[
          {
            label:
              manualKey === null
                ? t('authentication.second_factor_enable')
                : t('authentication.second_factor_confirm'),
            onPress: () => {
              void (manualKey === null ? begin() : confirm());
            },
            testID: manualKey === null ? 'second-factor-enable' : 'second-factor-confirm',
          },
        ]}
      />
    </MobileScreenContainer>
  );
}
