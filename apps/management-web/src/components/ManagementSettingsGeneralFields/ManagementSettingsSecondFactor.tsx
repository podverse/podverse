'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, Divider, StackForm, TextInput } from '@podverse/ui';

import {
  secondFactorDisable,
  secondFactorEnroll,
  secondFactorEnrollConfirm,
  secondFactorStatus,
} from '../../lib/requests/auth';

export function ManagementSettingsSecondFactor() {
  const t = useTranslations('auth');
  const [enrolled, setEnrolled] = useState(false);
  const [mode, setMode] = useState<'optional' | 'required'>('optional');
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    void secondFactorStatus()
      .then((status) => {
        setEnrolled(status.enrolled);
        setMode(status.mode);
      })
      .catch(() => {
        setEnrolled(false);
      });
  }, []);

  return (
    <>
      <Divider withSpacing />
      <h2>{t('secondFactorSettings')}</h2>
      <p>{t('secondFactorSetupHelp')}</p>
      {backupCodes !== null ? (
        <pre data-testid="second-factor-backup-codes">{backupCodes.join('\n')}</pre>
      ) : null}
      {manualKey !== null ? <p data-testid="second-factor-manual-key">{manualKey}</p> : null}
      {manualKey !== null ? (
        <StackForm
          onSubmit={(event) => {
            event.preventDefault();
            void secondFactorEnrollConfirm({ code }).then((confirmed) => {
              setBackupCodes(confirmed.backupCodes ?? null);
              setEnrolled(true);
              setManualKey(null);
            });
          }}
        >
          <TextInput
            eyebrow={t('secondFactorCode')}
            id="management-second-factor-code"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
          <Button type="submit">{t('secondFactorConfirm')}</Button>
        </StackForm>
      ) : null}
      {!enrolled && manualKey === null ? (
        <Button
          id="second-factor-enable"
          onClick={() => {
            void secondFactorEnroll().then((started) => {
              setManualKey(started.manualKey ?? null);
            });
          }}
          type="button"
        >
          {t('secondFactorEnable')}
        </Button>
      ) : null}
      {enrolled && mode === 'optional' ? (
        <StackForm
          onSubmit={(event) => {
            event.preventDefault();
            void secondFactorDisable({ code, password }).then(() => {
              setEnrolled(false);
            });
          }}
        >
          <TextInput
            eyebrow={t('password')}
            id="management-second-factor-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <TextInput
            eyebrow={t('secondFactorCode')}
            id="management-second-factor-disable-code"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
          <Button type="submit" variant="danger">
            {t('secondFactorDisable')}
          </Button>
        </StackForm>
      ) : null}
    </>
  );
}
