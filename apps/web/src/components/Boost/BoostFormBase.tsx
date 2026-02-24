'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { isLnaddressRecipient } from '@podverse/v4v-btc-ln';
import type { MetaBoost } from '@podverse/v4v-metaboost';

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
import { useBoostAppRecipients } from './hooks/useBoostAppRecipients';
import { useBoostRecipients } from './hooks/useBoostRecipients';
import { useBoostRecipientStatuses } from './hooks/useBoostRecipientStatuses';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type ChannelValue = NonNullable<DTOChannel['channel_values']>[number];
type ItemValue = NonNullable<DTOItem['item_values']>[number];

type BoostTab = {
  key: string;
  label: string;
  onClick: () => void;
};

type BoostFormBaseProps = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  buttonTabs: BoostTab[];
  selectedKey: string;
  selectedValueKey: string | null;
  selectedChannelValue?: ChannelValue;
  selectedItemValue?: ItemValue;
  metaBoost: MetaBoost | null;
  includeCreatorRecipients: boolean;
  includeAppRecipient: boolean;
  appRecipientType?: string | null;
  appRecipientRecipientType?: string | null;
  showCreatorInput: boolean;
  showAppInput: boolean;
  showAppRecipientInfo: boolean;
  showMediaHeader: boolean;
  defaultTotalAmountToCreator?: number;
  defaultTotalAmountToApp?: number;
};

export const BoostFormBase: React.FC<BoostFormBaseProps> = ({
  channel,
  item,
  buttonTabs,
  selectedKey,
  selectedValueKey,
  selectedChannelValue,
  selectedItemValue,
  metaBoost,
  includeCreatorRecipients,
  includeAppRecipient,
  appRecipientType,
  appRecipientRecipientType,
  showCreatorInput,
  showAppInput,
  showAppRecipientInfo,
  showMediaHeader,
  defaultTotalAmountToCreator = 1,
  defaultTotalAmountToApp = 0,
}) => {
  const config = useConfig();
  const { boostFormDefaults, setBoostFormDefaults } = useLocalSettings();
  const { setModalBoost, setModalBoostMessageError } = useModals();
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const [totalAmountToCreator, setTotalAmountToCreator] = useState<number>(
    defaultTotalAmountToCreator
  );
  const [totalAmountToApp, setTotalAmountToApp] = useState<number>(defaultTotalAmountToApp);
  const [yourName, setYourName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!showCreatorInput) {
      setTotalAmountToCreator(0);
    }
  }, [showCreatorInput]);

  useEffect(() => {
    if (!showAppInput) {
      setTotalAmountToApp(0);
    }
  }, [showAppInput]);

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
  }, [selectedValueKey, boostFormDefaults]);

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

  const { appValueRecipient, paymentRecipients: appPaymentRecipients } = useBoostAppRecipients({
    totalAmountToApp,
    appRecipientType: appRecipientType ?? selectedChannelValue?.type ?? null,
    appRecipientRecipientType,
    includeAppRecipient,
  });

  const {
    channelValueRecipients,
    itemValueRecipients,
    paymentRecipients: creatorPaymentRecipients,
  } = useBoostRecipients({
    selectedChannelValue,
    selectedItemValue,
    totalAmountToCreator,
    includeCreatorRecipients,
  });

  const paymentRecipients = [...creatorPaymentRecipients, ...appPaymentRecipients];

  const {
    hasStatusUpdates,
    recipientStatuses,
    setRecipientStatuses,
    toRecipientStatuses,
    updateRecipientStatus,
  } = useBoostRecipientStatuses();

  const hasLnaddressRecipients = paymentRecipients.some((recipient) =>
    isLnaddressRecipient(recipient.recipient_type ?? '')
  );

  const shouldShowBoostMessageNotice = hasLnaddressRecipients && !metaBoost;

  const { handleSubmitBoost } = useBoostPayments({
    channel,
    item,
    config,
    tValue,
    message,
    yourName,
    metaBoost,
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

  if (paymentRecipients.length === 0) {
    return null;
  }

  const hasResults = recipientStatuses.length > 0 && !isSubmitting;
  const allFailed =
    recipientStatuses.length > 0 && recipientStatuses.every((r) => r.status === 'failed');
  const showFormInputs = recipientStatuses.length === 0;

  const goBackFromResults = (): void => {
    setRecipientStatuses([]);
  };

  return (
    <div>
      {showFormInputs && (
        <>
          {showMediaHeader && channel && <MediaHeaderMini channel={channel} item={item} />}
          {buttonTabs.length > 0 && (
            <ButtonTabs buttonTabs={buttonTabs} selectedKey={selectedKey} />
          )}
          {shouldShowBoostMessageNotice && <BoostMessageNotice tValue={tValue} />}
          <BoostFormFields
            totalAmountToCreator={totalAmountToCreator}
            totalAmountToApp={totalAmountToApp}
            setTotalAmountToCreator={setTotalAmountToCreator}
            setTotalAmountToApp={setTotalAmountToApp}
            selectedValueKey={selectedValueKey}
            isSubmitting={isSubmitting}
            hasStatusUpdates={hasStatusUpdates}
            showCreatorInput={showCreatorInput}
            showAppInput={showAppInput}
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
                    showAppRecipient={showAppRecipientInfo}
                  />
                </>
              }
              color="link"
              size="small"
            />
          </div>
        </>
      )}
      <BoostRecipientStatusList
        recipientStatuses={recipientStatuses}
        tValue={tValue}
        selectedValueKey={selectedValueKey}
      />
      <div className={styles.buttons}>
        {hasResults ? (
          allFailed ? (
            <>
              <Button variant="secondary" onClick={goBackFromResults}>
                {tMisc('go_back')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setModalBoost({ channel: null, item: null })}
              >
                {tMisc('close')}
              </Button>
            </>
          ) : (
            <Button onClick={() => setModalBoost({ channel: null, item: null })}>
              {tMisc('close')}
            </Button>
          )
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => setModalBoost({ channel: null, item: null })}
              disabled={isSubmitting}
            >
              {tMisc('cancel')}
            </Button>
            <Button onClick={handleSubmitBoost} isLoading={isSubmitting} disabled={isSubmitting}>
              {tMisc('submit')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
