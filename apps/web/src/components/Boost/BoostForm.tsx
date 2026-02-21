'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { Button } from '../Button/Button';
import Accordion from '../Accordian/Accordian';
import { MediaHeaderMini } from '../MediaHeaderMini/MediaHeaderMini';
import { ButtonTabs } from '../Tabs/ButtonTabs';
import { BoostRecipientInfo } from './BoostRecipientInfo';
import { BoostFormFields } from './BoostFormFields';
import { BoostMessageNotice } from './BoostMessageNotice';
import { BoostMetaBoostInfo } from './BoostMetaBoostInfo';
import { BoostRecipientStatusList } from './BoostRecipientStatusList';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useModals } from '../../contexts/Modals';
import { useBoostPayments } from './hooks/useBoostPayments';
import { useBoostRecipients } from './hooks/useBoostRecipients';
import { useBoostSelection } from './hooks/useBoostSelection';
import { useBoostTestFlow } from './hooks/useBoostTestFlow';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type BoostFormProps = {
  channel: DTOChannel;
  item: DTOItem | null;
  className?: string;
  /** TEMPORARY: enable mock payment flow via ?boostTest=1 */
  boostTestMode?: boolean;
};

function getBoostTestModeFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('boostTest') === '1' || params.get('boostTest') === 'true';
}

export const BoostForm: React.FC<BoostFormProps> = ({
  className: _className,
  channel,
  item,
  boostTestMode: boostTestModeProp = false,
}) => {
  const config = useConfig();
  const { boostFormDefaults, setBoostFormDefaults } = useLocalSettings();
  const { setModalBoost, setModalBoostMessageError } = useModals();
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const [totalAmountToCreator, setTotalAmountToCreator] = useState<number>(1);
  const [totalAmountToApp, setTotalAmountToApp] = useState<number>(0);
  const [yourName, setYourName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boostTestMode, setBoostTestMode] = useState(boostTestModeProp);

  useEffect(() => {
    if (!boostTestModeProp && typeof window !== 'undefined') {
      setBoostTestMode(getBoostTestModeFromUrl());
    }
  }, [boostTestModeProp]);
  const {
    buttonTabs,
    selectedChannelValue,
    selectedItemValue,
    selectedKey,
    selectedMethod,
    selectedValueKey,
    metaBoost,
  } = useBoostSelection({ channel, item, tValue });

  const lastSavedRef = useRef<{
    key: string;
    totalAmountToCreator: number;
    totalAmountToApp: number;
    yourName: string;
  } | null>(null);
  const justLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedValueKey === null || selectedValueKey === '') return;
    const saved = boostFormDefaults[selectedValueKey];
    if (saved) {
      setTotalAmountToCreator(saved.totalAmountToCreator);
      setTotalAmountToApp(saved.totalAmountToApp);
      setYourName(saved.yourName);
      lastSavedRef.current = {
        key: selectedValueKey,
        totalAmountToCreator: saved.totalAmountToCreator,
        totalAmountToApp: saved.totalAmountToApp,
        yourName: saved.yourName,
      };
    } else {
      lastSavedRef.current = null;
    }
    justLoadedKeyRef.current = selectedValueKey;
  }, [selectedValueKey]); // load from storage only when value-type tab changes

  useEffect(() => {
    if (selectedValueKey === null || selectedValueKey === '') return;
    if (justLoadedKeyRef.current === selectedValueKey) {
      justLoadedKeyRef.current = null;
      return;
    }
    const last = lastSavedRef.current;
    const sameKey = last !== null && last.key === selectedValueKey;
    const unchanged =
      sameKey &&
      last.totalAmountToCreator === totalAmountToCreator &&
      last.totalAmountToApp === totalAmountToApp &&
      last.yourName === yourName;
    if (unchanged) return;
    lastSavedRef.current = {
      key: selectedValueKey,
      totalAmountToCreator,
      totalAmountToApp,
      yourName,
    };
    setBoostFormDefaults((prev) => ({
      ...prev,
      [selectedValueKey]: {
        totalAmountToCreator,
        totalAmountToApp,
        yourName,
      },
    }));
  }, [selectedValueKey, totalAmountToCreator, totalAmountToApp, yourName, setBoostFormDefaults]);

  const {
    appValueRecipient,
    channelValueRecipients,
    hasStatusUpdates,
    itemValueRecipients,
    paymentRecipients,
    recipientStatuses,
    setRecipientStatuses,
    shouldShowBoostMessageNotice,
    toRecipientStatuses,
    updateRecipientStatus,
  } = useBoostRecipients({
    selectedChannelValue,
    selectedItemValue,
    totalAmountToCreator,
    totalAmountToApp,
    selectedMethod,
    metaBoost,
  });

  const { handleSubmitBoost } = useBoostPayments({
    channel,
    item,
    config,
    tValue,
    message,
    yourName,
    metaBoost,
    selectedMethod,
    totalAmountToCreator,
    totalAmountToApp,
    paymentRecipients,
    toRecipientStatuses,
    updateRecipientStatus,
    setRecipientStatuses,
    setIsSubmitting,
    setModalBoostMessageError,
    onBoostSuccess: () => setMessage(''),
  });

  const { step, handleTestSubmit, goBack } = useBoostTestFlow({
    enabled: boostTestMode,
    paymentRecipients,
    toRecipientStatuses,
    updateRecipientStatus,
    setRecipientStatuses,
    setIsSubmitting,
    failedMessage: tValue('boost_messages.status_failed'),
  });

  if (paymentRecipients.length === 0) {
    return null;
  }

  if (step === 'summary') {
    const hasAnySuccess = recipientStatuses.some((r) => r.status === 'success');
    const totalSent = recipientStatuses
      .filter((r) => r.status === 'success')
      .reduce((s, r) => s + r.final_amount, 0);
    const totalFailed = recipientStatuses
      .filter((r) => r.status === 'failed')
      .reduce((s, r) => s + r.final_amount, 0);
    const denomination = tValue('types.lightning_keysend.denomination');
    return (
      <div>
        <h2 className={styles.summaryHeading}>{tValue('boost_messages.status_summary')}</h2>
        <BoostRecipientStatusList recipientStatuses={recipientStatuses} tValue={tValue} />
        <hr className={styles.summaryDivider} />
        <div className={styles.summaryTotals}>
          {totalSent > 0 && (
            <div className={styles.summarySuccessful}>
              {tValue('boost_messages.successfully_sent')}
              {totalSent} {denomination}
            </div>
          )}
          {totalFailed > 0 && (
            <div className={styles.summaryFailed}>
              {tValue('boost_messages.failed_to_send')}
              {totalFailed} {denomination}
            </div>
          )}
        </div>
        <div className={styles.buttons}>
          {hasAnySuccess ? (
            <Button onClick={() => setModalBoost({ channel: null, item: null })}>
              {tMisc('close')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={goBack}>
                {tMisc('go_back')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setModalBoost({ channel: null, item: null })}
              >
                {tMisc('cancel')}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!isSubmitting && (
        <>
          <MediaHeaderMini channel={channel} item={item} />
          <ButtonTabs buttonTabs={buttonTabs} selectedKey={selectedKey} />
          {shouldShowBoostMessageNotice && <BoostMessageNotice tValue={tValue} />}
          <BoostFormFields
            totalAmountToCreator={totalAmountToCreator}
            totalAmountToApp={totalAmountToApp}
            setTotalAmountToCreator={setTotalAmountToCreator}
            setTotalAmountToApp={setTotalAmountToApp}
            selectedValueKey={selectedValueKey}
            isSubmitting={isSubmitting}
            hasStatusUpdates={hasStatusUpdates}
            yourName={yourName}
            setYourName={setYourName}
            message={message}
            setMessage={setMessage}
            tValue={tValue}
            tMisc={tMisc}
            brandName={config.public.brand.name}
          />
          <div className={styles.moreInfo}>
            <Accordion
              header={tMisc('more_info')}
              content={
                <>
                  {metaBoost && <BoostMetaBoostInfo metaBoost={metaBoost} />}
                  <BoostRecipientInfo
                    channel_value_recipients={channelValueRecipients}
                    item_value_recipients={itemValueRecipients}
                    app_value_recipient={appValueRecipient}
                    totalAmountToCreator={totalAmountToCreator}
                    totalAmountToApp={totalAmountToApp}
                  />
                </>
              }
              color="link"
              size="small"
            />
          </div>
        </>
      )}
      <BoostRecipientStatusList recipientStatuses={recipientStatuses} tValue={tValue} />
      <div className={styles.buttons}>
        <Button
          variant="secondary"
          onClick={() => setModalBoost({ channel: null, item: null })}
          disabled={isSubmitting}
        >
          {tMisc('cancel')}
        </Button>
        <Button
          onClick={boostTestMode ? handleTestSubmit : handleSubmitBoost}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {tMisc('submit')}
        </Button>
      </div>
    </div>
  );
};
