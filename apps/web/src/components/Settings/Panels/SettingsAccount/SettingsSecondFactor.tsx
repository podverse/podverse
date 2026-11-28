'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, FormInfoMessageText, StackForm, TextInput } from '@podverse/ui';

import { getApiRequestService } from '../../../../factories/apiRequestService';
import { SettingsSection } from '../../SettingsSection';

export function SettingsSecondFactor() {
  const tAuthentication = useTranslations('authentication');
  const [mode, setMode] = useState<'optional' | 'required' | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void getApiRequestService()
      .reqAuthSecondFactorStatus()
      .then((status) => {
        setMode(status.mode);
        setEnrolled(status.enrolled);
      })
      .catch(() => {
        setMode(null);
      });
  }, []);

  const begin = async () => {
    const started = await getApiRequestService().reqAuthSecondFactorEnroll();
    setQrDataUrl(typeof started.qrDataUrl === 'string' ? started.qrDataUrl : null);
    setManualKey(typeof started.manualKey === 'string' ? started.manualKey : null);
    setBackupCodes(null);
    setNotice(tAuthentication('second_factor_setup_help'));
  };

  const confirm = async () => {
    const confirmed = await getApiRequestService().reqAuthSecondFactorEnrollConfirm({ code });
    setBackupCodes(confirmed.backupCodes ?? null);
    setEnrolled(true);
    setManualKey(null);
    setQrDataUrl(null);
    setCode('');
  };

  const disable = async () => {
    await getApiRequestService().reqAuthSecondFactorDisable({ password, code });
    setEnrolled(false);
    setBackupCodes(null);
    setNotice(tAuthentication('second_factor_removed'));
  };

  if (mode === null) {
    return null;
  }

  return (
    <SettingsSection>
      <h2>{tAuthentication('second_factor_settings')}</h2>
      {notice !== null ? <FormInfoMessageText message={notice} /> : null}
      {qrDataUrl !== null ? <img alt="" src={qrDataUrl} /> : null}
      {manualKey !== null ? <p id="second-factor-manual-key">{manualKey}</p> : null}
      {backupCodes !== null ? (
        <>
          <FormInfoMessageText message={tAuthentication('second_factor_backup_help')} />
          <p id="second-factor-backup-codes" style={{ whiteSpace: 'pre-wrap' }}>
            {backupCodes.join('\n')}
          </p>
        </>
      ) : null}
      <StackForm
        onSubmit={(event) => {
          event.preventDefault();
          void (enrolled && manualKey === null ? disable() : confirm());
        }}
      >
        {manualKey !== null || enrolled ? (
          <TextInput
            eyebrow={tAuthentication('second_factor_code')}
            id="settings-second-factor-code"
            name="code"
            onChange={(event) => setCode(event.target.value)}
            type="text"
            value={code}
          />
        ) : null}
        {enrolled && mode === 'optional' && manualKey === null ? (
          <TextInput
            eyebrow={tAuthentication('password')}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        ) : null}
        {manualKey === null && !enrolled ? (
          <Button id="second-factor-enable" onClick={() => void begin()} type="button">
            {tAuthentication('second_factor_enable')}
          </Button>
        ) : null}
        {manualKey !== null ? (
          <Button id="second-factor-confirm" type="submit">
            {tAuthentication('second_factor_confirm')}
          </Button>
        ) : null}
        {enrolled && mode === 'optional' && manualKey === null ? (
          <Button id="second-factor-disable" type="submit" variant="secondary">
            {tAuthentication('second_factor_disable')}
          </Button>
        ) : null}
      </StackForm>
    </SettingsSection>
  );
}
