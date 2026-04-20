'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { isLnaddressRecipient } from '@podverse/v4v-btc-ln';
import {
  getBoostCurrencyInputFormatMetadata,
  type MetaBoost,
  type PublicBucketConversionSnapshotErrorCode,
} from '@podverse/v4v-metaboost';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useModals } from '../../contexts/Modals';
import { Button } from '../Button/Button';
import { Callout } from '../Callout/Callout';
import { FormStack } from '../Form/FormStack';
import { MediaHeaderMini } from '../MediaHeaderMini/MediaHeaderMini';
import { ButtonTabs } from '../Tabs/ButtonTabs';
import { BoostFormFields } from './BoostFormFields';
import { BoostMessageNotice } from './BoostMessageNotice';
import { BoostMetaBoostInfo } from './BoostMetaBoostInfo';
import type { BoostPaymentScope } from './boostPaymentScope';
import { BoostRecipientInfo } from './BoostRecipientInfo';
import { BoostRecipientStatusList } from './BoostRecipientStatusList';
import type { MbrssV1RssContext } from './donateMbrssV1RssContext';
import { DonateSuccessConfetti } from './DonateSuccessConfetti';
import { convertBoostThresholdAmount } from './hooks/boostThresholdConversion';
import { useBoostAppRecipients } from './hooks/useBoostAppRecipients';
import { useBoostPayments } from './hooks/useBoostPayments';
import { useBoostRecipients } from './hooks/useBoostRecipients';
import { useBoostRecipientStatuses } from './hooks/useBoostRecipientStatuses';
import {
  BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT,
  useMbrssV1BoostCapability,
} from './hooks/useMbrssV1BoostCapability';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type ChannelValue = NonNullable<DTOChannel['channel_values']>[number];
type ItemValue = NonNullable<DTOItem['item_values']>[number];

type BoostTab = {
  key: string;
  label: string;
  onClick: () => void;
};

const resolveSourceCurrencyFromValueType = (valueType?: string | null): string | null => {
  if (valueType === 'lightning') {
    return 'BTC';
  }
  return null;
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
  boostPaymentScope: BoostPaymentScope;
  appRecipientType?: string | null;
  appRecipientRecipientType?: string | null;
  showCreatorInput: boolean;
  showAppInput: boolean;
  showAppRecipientInfo: boolean;
  showMediaHeader: boolean;
  defaultTotalAmountToCreator?: number;
  defaultTotalAmountToApp?: number;
  onDonationSuccess?: () => void;
  successPrimaryButtonLabel?: string;
  successPrimaryButtonOnClick?: () => void;
  noRecipientsFallback?: ReactNode;
  /** Donate flow: RSS fields aligned with podverse-boosts-feed.xml for mbrss-v1/BLIP. */
  mbrssV1RssContext?: MbrssV1RssContext | null;
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
  boostPaymentScope,
  appRecipientType,
  appRecipientRecipientType,
  showCreatorInput,
  showAppInput,
  showAppRecipientInfo,
  showMediaHeader,
  defaultTotalAmountToCreator = 1,
  defaultTotalAmountToApp = 0,
  onDonationSuccess,
  successPrimaryButtonLabel,
  successPrimaryButtonOnClick,
  noRecipientsFallback,
  mbrssV1RssContext,
}) => {
  const includeCreatorRecipients = boostPaymentScope === 'creator_only';
  const includeAppRecipient = boostPaymentScope === 'app_only';

  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { boostFormDefaults, setBoostFormDefaults } = useLocalSettings();
  const { setModalBoost, bumpPublicBoostMessagesRefresh } = useModals();
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const tDonate = useTranslations('donate');
  const hasSuccessOverride =
    successPrimaryButtonLabel !== undefined && successPrimaryButtonOnClick !== undefined;
  const [totalAmountToCreator, setTotalAmountToCreator] = useState<number>(() => {
    if (boostPaymentScope === 'app_only') {
      return 0;
    }
    if (selectedValueKey === null || selectedValueKey === '') return defaultTotalAmountToCreator;
    const s = boostFormDefaults[selectedValueKey];
    return s !== undefined ? s.totalAmountToCreator : defaultTotalAmountToCreator;
  });
  const [totalAmountToApp, setTotalAmountToApp] = useState<number>(() => {
    if (boostPaymentScope === 'creator_only') {
      return 0;
    }
    if (selectedValueKey === null || selectedValueKey === '') return defaultTotalAmountToApp;
    const s = boostFormDefaults[selectedValueKey];
    return s !== undefined ? s.totalAmountToApp : defaultTotalAmountToApp;
  });
  const [yourName, setYourName] = useState<string>(() => {
    if (selectedValueKey === null || selectedValueKey === '') return '';
    const s = boostFormDefaults[selectedValueKey];
    return s !== undefined ? s.yourName : '';
  });
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMetaBoostInfo, setShowMetaBoostInfo] = useState(false);

  useEffect(() => {
    if (boostPaymentScope === 'app_only') {
      setTotalAmountToCreator(0);
    } else {
      setTotalAmountToApp(0);
    }
  }, [boostPaymentScope]);

  const boostFormDefaultsRef = useRef(boostFormDefaults);
  boostFormDefaultsRef.current = boostFormDefaults;

  const lastSavedRef = useRef<{
    key: string;
    totalAmountToCreator: number;
    totalAmountToApp: number;
    yourName: string;
  } | null>(null);
  /** After a value-tab change, skip one persist pass — save effect still sees pre-load state in its closure. */
  const skipPersistAfterKeyLoadRef = useRef(false);

  // Load cached defaults only when the value tab (selectedValueKey) changes — not on every boostFormDefaults
  // save — so local edits stay authoritative and saves are not skipped by a competing reload effect.
  useEffect(() => {
    if (selectedValueKey === null || selectedValueKey === '') return;
    const saved = boostFormDefaultsRef.current[selectedValueKey];
    if (saved) {
      if (boostPaymentScope === 'app_only') {
        setTotalAmountToCreator(0);
        setTotalAmountToApp(saved.totalAmountToApp);
      } else {
        setTotalAmountToCreator(saved.totalAmountToCreator);
        setTotalAmountToApp(0);
      }
      setYourName(saved.yourName);
      lastSavedRef.current = {
        key: selectedValueKey,
        totalAmountToCreator: boostPaymentScope === 'app_only' ? 0 : saved.totalAmountToCreator,
        totalAmountToApp: boostPaymentScope === 'creator_only' ? 0 : saved.totalAmountToApp,
        yourName: saved.yourName,
      };
    } else {
      lastSavedRef.current = null;
    }
    skipPersistAfterKeyLoadRef.current = true;
  }, [selectedValueKey, boostPaymentScope]);

  useEffect(() => {
    if (selectedValueKey === null || selectedValueKey === '') return;
    if (skipPersistAfterKeyLoadRef.current) {
      skipPersistAfterKeyLoadRef.current = false;
      return;
    }
    const last = lastSavedRef.current;
    const sameKey = last !== null && last.key === selectedValueKey;
    const persistedCreator = boostPaymentScope === 'app_only' ? 0 : totalAmountToCreator;
    const persistedApp = boostPaymentScope === 'creator_only' ? 0 : totalAmountToApp;
    const unchanged =
      sameKey &&
      last.totalAmountToCreator === persistedCreator &&
      last.totalAmountToApp === persistedApp &&
      last.yourName === yourName;
    if (unchanged) return;
    lastSavedRef.current = {
      key: selectedValueKey,
      totalAmountToCreator: persistedCreator,
      totalAmountToApp: persistedApp,
      yourName,
    };
    setBoostFormDefaults((prev) => ({
      ...prev,
      [selectedValueKey]: {
        totalAmountToCreator: persistedCreator,
        totalAmountToApp: persistedApp,
        yourName,
      },
    }));
  }, [
    selectedValueKey,
    boostPaymentScope,
    totalAmountToCreator,
    totalAmountToApp,
    yourName,
    setBoostFormDefaults,
  ]);

  const { appValueRecipient, paymentRecipients: appPaymentRecipients } = useBoostAppRecipients({
    config,
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

  const {
    status: mbrssV1CapabilityStatus,
    messageCharLimit: mbrssV1MessageCharLimit,
    termsOfServiceUrl: mbrssV1TermsOfServiceUrl,
    senderBlocked: mbrssV1SenderBlocked,
    senderBlockMessage: mbrssV1SenderBlockMessage,
    preferredCurrency: mbrssV1PreferredCurrency,
    minimumMessageAmountMinor: mbrssV1MinimumMessageAmountMinor,
    conversionEndpointUrl: mbrssV1ConversionEndpointUrl,
  } = useMbrssV1BoostCapability(metaBoost, {
    fetchEnabled: metaBoost !== null && loggedInAccount !== null,
    senderGuid: loggedInAccount?.sender_guid ?? null,
  });
  const [thresholdNameMessageBlocked, setThresholdNameMessageBlocked] = useState(false);
  const [thresholdNotice, setThresholdNotice] = useState<string | null>(null);

  const getThresholdConversionErrorNotice = (
    code: PublicBucketConversionSnapshotErrorCode | 'missing_metadata'
  ): string => {
    if (code === 'missing_metadata') {
      return tValue('boost_messages.threshold_missing_metadata');
    }
    if (code === 'missing_amount_unit') {
      return tValue('boost_messages.threshold_amount_unit_missing');
    }
    if (code === 'invalid_amount_unit') {
      return tValue('boost_messages.threshold_amount_unit_invalid');
    }
    if (code === 'request_failed') {
      return tValue('boost_messages.threshold_conversion_unavailable');
    }
    return tValue('boost_messages.threshold_conversion_unavailable_guidance');
  };

  const messageMaxLength = useMemo((): number | undefined => {
    if (metaBoost === null) {
      return BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT;
    }
    if (mbrssV1CapabilityStatus === 'success' && mbrssV1MessageCharLimit !== null) {
      return mbrssV1MessageCharLimit;
    }
    return undefined;
  }, [metaBoost, mbrssV1CapabilityStatus, mbrssV1MessageCharLimit]);

  const mbrssV1MessageFieldBlocked =
    metaBoost !== null &&
    (mbrssV1CapabilityStatus !== 'success' ||
      (mbrssV1CapabilityStatus === 'success' && mbrssV1SenderBlocked));
  const mbrssV1MessageLoading = metaBoost !== null && mbrssV1CapabilityStatus === 'loading';
  const mbrssV1CapabilityFailed = metaBoost !== null && mbrssV1CapabilityStatus === 'error';
  const mbrssV1HttpMessagingEnabled =
    metaBoost !== null && mbrssV1CapabilityStatus === 'success' && !mbrssV1SenderBlocked;

  const mbrssV1SenderBlockedPreflightMessage =
    metaBoost !== null &&
    loggedInAccount !== null &&
    mbrssV1CapabilityStatus === 'success' &&
    mbrssV1SenderBlocked
      ? (mbrssV1SenderBlockMessage ?? tValue('boost_messages.sender_blocked_preflight_fallback'))
      : null;
  const selectedValueType =
    selectedItemValue?.type ?? selectedChannelValue?.type ?? appRecipientType ?? selectedValueKey;
  const sourceAmountCurrencyCode = resolveSourceCurrencyFromValueType(selectedValueType);
  const sourceAmountMetadata =
    metaBoost !== null && sourceAmountCurrencyCode !== null
      ? getBoostCurrencyInputFormatMetadata(sourceAmountCurrencyCode)
      : null;
  const sourceAmountCurrency = sourceAmountMetadata?.currency ?? null;
  const sourceAmountUnit = sourceAmountMetadata?.canonicalAmountUnit ?? null;

  useEffect(() => {
    if (typeof messageMaxLength !== 'number') {
      return;
    }
    setMessage((previous) =>
      previous.length > messageMaxLength ? previous.slice(0, messageMaxLength) : previous
    );
  }, [messageMaxLength]);

  const effectiveTotal = boostPaymentScope === 'app_only' ? totalAmountToApp : totalAmountToCreator;
  const normalizedBoostAmountMinor = Math.max(0, Math.round(effectiveTotal));

  const { handleSubmitBoost } = useBoostPayments({
    channel,
    item,
    mbrssV1RssContext,
    config,
    tValue,
    message,
    yourName,
    metaBoost,
    paymentRecipients,
    toRecipientStatuses,
    updateRecipientStatus,
    setRecipientStatuses,
    setIsSubmitting,
    onBoostSuccess: () => {
      setMessage('');
      bumpPublicBoostMessagesRefresh();
    },
    mbrssV1HttpMessagingEnabled,
    mbrssV1SenderGuid: loggedInAccount?.sender_guid ?? null,
    sourceAmountMinor: normalizedBoostAmountMinor,
    sourceCurrency: sourceAmountCurrency,
    sourceAmountUnit,
    thresholdPreferredCurrency: mbrssV1PreferredCurrency,
    thresholdMinimumMessageAmountMinor: mbrssV1MinimumMessageAmountMinor,
    thresholdConversionEndpointUrl: mbrssV1ConversionEndpointUrl,
    isLoggedIn: loggedInAccount !== null,
  });

  useEffect(() => {
    let cancelled = false;
    setThresholdNameMessageBlocked(false);
    setThresholdNotice(null);

    const evaluateThreshold = async (): Promise<void> => {
      if (metaBoost === null || mbrssV1CapabilityStatus !== 'success') {
        return;
      }
      const thresholdAmountMinor = mbrssV1MinimumMessageAmountMinor ?? 0;
      if (thresholdAmountMinor <= 0) {
        return;
      }
      const preferredCurrency = mbrssV1PreferredCurrency?.trim().toUpperCase() ?? null;
      if (preferredCurrency === null || preferredCurrency === '') {
        if (cancelled) {
          return;
        }
        setThresholdNameMessageBlocked(true);
        setThresholdNotice(getThresholdConversionErrorNotice('missing_metadata'));
        return;
      }
      if (mbrssV1ConversionEndpointUrl === null || mbrssV1ConversionEndpointUrl.trim() === '') {
        if (cancelled) {
          return;
        }
        setThresholdNameMessageBlocked(true);
        setThresholdNotice(getThresholdConversionErrorNotice('missing_metadata'));
        return;
      }
      if (sourceAmountCurrency === null || sourceAmountUnit === null) {
        if (cancelled) {
          return;
        }
        setThresholdNameMessageBlocked(true);
        setThresholdNotice(getThresholdConversionErrorNotice('missing_metadata'));
        return;
      }

      const conversionResult = await convertBoostThresholdAmount({
        sourceCurrency: sourceAmountCurrency,
        sourceAmountMinor: normalizedBoostAmountMinor,
        sourceAmountUnit: sourceAmountUnit,
        context: {
          preferredCurrency,
          minimumMessageAmountMinor: thresholdAmountMinor,
          conversionEndpointUrl: mbrssV1ConversionEndpointUrl,
        },
      });

      if (cancelled) {
        return;
      }
      if (!conversionResult.ok) {
        setThresholdNameMessageBlocked(true);
        setThresholdNotice(getThresholdConversionErrorNotice(conversionResult.code));
        return;
      }

      const convertedAmountMinor = conversionResult.target.amountMinor;
      const belowThreshold = convertedAmountMinor < thresholdAmountMinor;

      setThresholdNameMessageBlocked(belowThreshold);
      setThresholdNotice(
        tValue('boost_messages.threshold_notice', {
          minimumAmountMinor: thresholdAmountMinor,
          preferredCurrency,
          convertedAmountMinor,
        })
      );
    };

    void evaluateThreshold();

    return () => {
      cancelled = true;
    };
  }, [
    mbrssV1CapabilityStatus,
    mbrssV1ConversionEndpointUrl,
    mbrssV1MinimumMessageAmountMinor,
    mbrssV1PreferredCurrency,
    metaBoost,
    normalizedBoostAmountMinor,
    sourceAmountCurrency,
    sourceAmountUnit,
  ]);

  const totalAmountZeroOrLess = effectiveTotal <= 0;
  const hasResults = recipientStatuses.length > 0 && !isSubmitting;
  const allFailed =
    recipientStatuses.length > 0 && recipientStatuses.every((r) => r.status === 'failed');
  const showFormInputs = recipientStatuses.length === 0;
  const isSuccess = hasResults && !allFailed;

  const onDonationSuccessCalledRef = useRef(false);
  useEffect(() => {
    if (isSuccess && onDonationSuccess !== undefined && !onDonationSuccessCalledRef.current) {
      onDonationSuccessCalledRef.current = true;
      onDonationSuccess();
    }
  }, [isSuccess, onDonationSuccess]);

  if (paymentRecipients.length === 0) {
    return <>{noRecipientsFallback ?? null}</>;
  }

  const goBackFromResults = (): void => {
    setRecipientStatuses([]);
  };

  return (
    <div>
      <FormStack className={styles.formWrapper}>
        {showFormInputs && (
          <>
            {showMediaHeader && channel && <MediaHeaderMini channel={channel} item={item} />}
            {buttonTabs.length > 0 && (
              <ButtonTabs buttonTabs={buttonTabs} selectedKey={selectedKey} />
            )}
            {loggedInAccount === null && (
              <Callout>
                <p>{tValue('boost_messages.login_required_to_send_boosts')}</p>
              </Callout>
            )}
            <BoostFormFields
              totalAmountToCreator={totalAmountToCreator}
              totalAmountToApp={totalAmountToApp}
              setTotalAmountToCreator={setTotalAmountToCreator}
              setTotalAmountToApp={setTotalAmountToApp}
              selectedValueKey={selectedValueKey}
              denominationTypeKeyOverride={boostPaymentScope === 'app_only' ? 'lightning' : null}
              isSubmitting={isSubmitting}
              hasStatusUpdates={hasStatusUpdates}
              showCreatorInput={showCreatorInput}
              showAppInput={showAppInput}
              showNameAndMessage={!shouldShowBoostMessageNotice}
              yourName={yourName}
              setYourName={setYourName}
              message={message}
              setMessage={setMessage}
              messageMaxLength={messageMaxLength}
              mbrssV1MessageFieldBlocked={mbrssV1MessageFieldBlocked}
              mbrssV1MessageLoading={mbrssV1MessageLoading}
              mbrssV1CapabilityFailed={mbrssV1CapabilityFailed}
              mbrssV1SenderBlockedPreflightMessage={mbrssV1SenderBlockedPreflightMessage}
              thresholdNameMessageBlocked={thresholdNameMessageBlocked}
              thresholdMessageNotice={thresholdNotice}
              thresholdPreferredCurrency={mbrssV1PreferredCurrency}
              thresholdConversionEndpointUrl={mbrssV1ConversionEndpointUrl}
              sourceCurrencyCode={sourceAmountCurrencyCode}
              tValue={tValue}
              tMisc={tMisc}
              brandName={config.public.brand.name}
              metaBoost={metaBoost}
              isLoggedIn={loggedInAccount !== null}
              showMetaBoostInfo={showMetaBoostInfo}
              onToggleMetaBoostInfo={() => setShowMetaBoostInfo((s) => !s)}
            />
            {shouldShowBoostMessageNotice && (
              <BoostMessageNotice tValue={tValue} isAppDonate={boostPaymentScope === 'app_only'} />
            )}
            <div className={styles.moreInfo}>
              {metaBoost && showMetaBoostInfo && (
                <Callout>
                  <BoostMetaBoostInfo
                    boostNodeUrl={metaBoost.node}
                    termsOfServiceUrl={
                      mbrssV1CapabilityStatus === 'success' ? mbrssV1TermsOfServiceUrl : null
                    }
                  />
                </Callout>
              )}
              <BoostRecipientInfo
                channel_value_recipients={channelValueRecipients}
                item_value_recipients={itemValueRecipients}
                app_value_recipient={appValueRecipient}
                totalAmountToCreator={totalAmountToCreator}
                totalAmountToApp={totalAmountToApp}
                showAppRecipient={showAppRecipientInfo}
              />
            </div>
          </>
        )}
        <BoostRecipientStatusList
          recipientStatuses={recipientStatuses}
          tValue={tValue}
          selectedValueKey={boostPaymentScope === 'app_only' ? 'lightning' : selectedValueKey}
        />
        {isSuccess && hasSuccessOverride && (
          <div className={styles.donateSuccessWrapper}>
            <div className={styles.donateSuccessBlock}>
              <p className={styles.donateSuccessThankYou}>{tDonate('success_thank_you')}</p>
              <p className={styles.donateSuccessMessage}>
                {tDonate('success_message', { brand_name: config.public.brand.name })}
              </p>
            </div>
            <DonateSuccessConfetti />
          </div>
        )}
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
            ) : hasSuccessOverride ? (
              <Button onClick={successPrimaryButtonOnClick}>{successPrimaryButtonLabel}</Button>
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
              >
                {tMisc('cancel')}
              </Button>
              <Button
                onClick={handleSubmitBoost}
                isLoading={isSubmitting}
                disabled={isSubmitting || totalAmountZeroOrLess || loggedInAccount === null}
              >
                {tMisc('submit')}
              </Button>
            </>
          )}
        </div>
      </FormStack>
    </div>
  );
};
