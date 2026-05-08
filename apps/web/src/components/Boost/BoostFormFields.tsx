import { useLocale } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

import { Button, FormTextArea, StackForm, TextInput, TextInputNumber } from '@podverse/ui';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import {
  getBoostCurrencyInputFormatMetadata,
  parseMajorUnitToMinorAmount,
  type ParseMajorUnitToMinorResult,
} from '@podverse/v4v-metaboost';

import { useBoostBaselineEstimate } from './hooks/useBoostBaselineEstimate';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostFormFieldsProps = {
  totalAmountToCreator: number;
  totalAmountToApp: number;
  setTotalAmountToCreator: (value: number) => void;
  setTotalAmountToApp: (value: number) => void;
  selectedValueKey: string | null;
  /** If set, used for `types.*.denomination` (e.g. /donate storage key differs from `lightning` i18n). */
  denominationTypeKeyOverride?: string | null;
  isSubmitting: boolean;
  hasStatusUpdates: boolean;
  showCreatorInput: boolean;
  showAppInput: boolean;
  /** When false, name and message inputs are hidden (boost messages not enabled). */
  showNameAndMessage: boolean;
  yourName: string;
  setYourName: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  /** Max length for message; omit when mbrss-v1 capability is still loading (no counter yet). */
  messageMaxLength?: number;
  /** mbrss-v1: message field blocked until capability succeeds; show overlay while loading. */
  mbrssV1MessageFieldBlocked: boolean;
  mbrssV1MessageLoading: boolean;
  mbrssV1CapabilityFailed: boolean;
  /** When set, recipient blocks this Podverse sender from MetaBoost messages (preflight GET). */
  mbrssV1SenderBlockedPreflightMessage?: string | null;
  thresholdPreferredCurrency?: string | null;
  thresholdConversionEndpointUrl?: string | null;
  sourceCurrencyCode?: string | null;
  tValue: Translator;
  tMisc: Translator;
  brandName: string;
  metaBoost?: MetaBoost | null;
  /** When false, boost amounts and send-related fields are read-only (must log in to Podverse). */
  isLoggedIn: boolean;
  showMetaBoostInfo?: boolean;
  onToggleMetaBoostInfo?: () => void;
};

type EstimateWithTooltipProps = {
  estimateText: string;
  tooltipText: string;
};

const EstimateWithTooltip = ({ estimateText, tooltipText }: EstimateWithTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen || !isPinned) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (containerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setIsPinned(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isPinned]);

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
      return;
    }
    setIsPinned(true);
    setIsOpen(true);
  };

  return (
    <span
      ref={containerRef}
      className={styles.boostAmountEstimateContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={styles.boostAmountEstimateButton}
        onClick={handleClick}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
      >
        {estimateText}*
      </button>
      {isOpen ? (
        <span id={tooltipId} role="tooltip" className={styles.boostAmountEstimateTooltip}>
          {tooltipText}
        </span>
      ) : null}
    </span>
  );
};

export const BoostFormFields = ({
  totalAmountToCreator,
  totalAmountToApp,
  setTotalAmountToCreator,
  setTotalAmountToApp,
  selectedValueKey,
  denominationTypeKeyOverride = null,
  isSubmitting,
  hasStatusUpdates,
  showCreatorInput,
  showAppInput,
  showNameAndMessage,
  yourName,
  setYourName,
  message,
  setMessage,
  messageMaxLength,
  mbrssV1MessageFieldBlocked,
  mbrssV1MessageLoading,
  mbrssV1CapabilityFailed,
  mbrssV1SenderBlockedPreflightMessage = null,
  thresholdPreferredCurrency = null,
  thresholdConversionEndpointUrl = null,
  sourceCurrencyCode = null,
  tValue,
  tMisc,
  brandName,
  metaBoost = null,
  isLoggedIn,
  showMetaBoostInfo = false,
  onToggleMetaBoostInfo,
}: BoostFormFieldsProps) => {
  const denominationTypeKey = denominationTypeKeyOverride ?? selectedValueKey;
  const nameMessageFieldsDisabled =
    isSubmitting || hasStatusUpdates || !isLoggedIn || mbrssV1MessageFieldBlocked;
  const boostCurrencyFormatMetadata =
    metaBoost !== null && sourceCurrencyCode !== null
      ? getBoostCurrencyInputFormatMetadata(sourceCurrencyCode)
      : null;
  const locale = useLocale();
  const sourceCurrency = boostCurrencyFormatMetadata?.currency ?? null;
  const sourceAmountUnit = boostCurrencyFormatMetadata?.canonicalAmountUnit ?? null;
  const [creatorAmountInputError, setCreatorAmountInputError] = useState<string | undefined>(
    undefined
  );
  const [appAmountInputError, setAppAmountInputError] = useState<string | undefined>(undefined);
  const creatorBaselineEstimate = useBoostBaselineEstimate({
    sourceAmountMinor: Math.max(0, Math.round(totalAmountToCreator)),
    sourceCurrency,
    sourceAmountUnit,
    preferredCurrency: thresholdPreferredCurrency,
    conversionEndpointUrl: thresholdConversionEndpointUrl,
    locale,
    enabled: metaBoost !== null,
  });
  const appBaselineEstimate = useBoostBaselineEstimate({
    sourceAmountMinor: Math.max(0, Math.round(totalAmountToApp)),
    sourceCurrency,
    sourceAmountUnit,
    preferredCurrency: thresholdPreferredCurrency,
    conversionEndpointUrl: thresholdConversionEndpointUrl,
    locale,
    enabled: metaBoost !== null,
  });

  const getAmountInputErrorMessage = (
    result: ParseMajorUnitToMinorResult,
    currencyCode: string,
    minorUnitExponent: number
  ): string | undefined => {
    if (result.ok) {
      return undefined;
    }
    if (result.code === 'too_many_decimals') {
      return tValue('boost_messages.amount_input_too_many_decimals', {
        currency: currencyCode,
        decimals: minorUnitExponent,
      });
    }
    if (result.code === 'not_supported') {
      return tValue('boost_messages.amount_input_not_supported', { currency: currencyCode });
    }
    return tValue('boost_messages.amount_input_invalid_number');
  };

  const parseBoostAmountInput = (valueText: string): number | null => {
    if (boostCurrencyFormatMetadata === null) {
      return Number(valueText);
    }
    if (valueText.trim() === '') {
      return 0;
    }
    const parsed = parseMajorUnitToMinorAmount(valueText, boostCurrencyFormatMetadata.currency);
    return parsed.ok ? parsed.minorAmount : null;
  };

  return (
    <StackForm
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <div className={styles.boostAmountInputs}>
        {showCreatorInput && (
          <div className={styles.boostAmountInputRow}>
            <div className={styles.boostAmountInputControl}>
              <TextInputNumber
                eyebrow={tValue('send_to.creator')}
                stepperAriaLabels={{
                  decrement: tMisc('decrement'),
                  increment: tMisc('increment'),
                }}
                value={totalAmountToCreator}
                min={0}
                step={
                  boostCurrencyFormatMetadata !== null
                    ? Number(boostCurrencyFormatMetadata.inputStep)
                    : 1
                }
                onChange={(e) => {
                  if (boostCurrencyFormatMetadata === null) {
                    const parsedAmount = parseBoostAmountInput(e.target.value);
                    if (parsedAmount !== null) {
                      setTotalAmountToCreator(parsedAmount);
                      setCreatorAmountInputError(undefined);
                    }
                    return;
                  }

                  if (e.target.value.trim() === '') {
                    setTotalAmountToCreator(0);
                    setCreatorAmountInputError(undefined);
                    return;
                  }

                  const parsed = parseMajorUnitToMinorAmount(
                    e.target.value,
                    boostCurrencyFormatMetadata.currency
                  );
                  const parsedAmount = parsed.ok ? parsed.minorAmount : null;
                  if (parsedAmount !== null) {
                    setTotalAmountToCreator(parsedAmount);
                    setCreatorAmountInputError(undefined);
                    return;
                  }
                  setCreatorAmountInputError(
                    getAmountInputErrorMessage(
                      parsed,
                      boostCurrencyFormatMetadata.currency,
                      boostCurrencyFormatMetadata.minorUnitExponent
                    )
                  );
                }}
                sideText={
                  boostCurrencyFormatMetadata?.canonicalAmountUnit ??
                  (denominationTypeKey
                    ? tValue(`types.${denominationTypeKey}.denomination`)
                    : undefined)
                }
                prefix={boostCurrencyFormatMetadata?.symbolPrefix ?? undefined}
                infoError={creatorAmountInputError}
                disabled={isSubmitting || hasStatusUpdates || !isLoggedIn}
              />
            </div>
            {creatorBaselineEstimate ? (
              <EstimateWithTooltip
                estimateText={creatorBaselineEstimate}
                tooltipText={tValue('boost_messages.baseline_estimate_tooltip_text')}
              />
            ) : null}
          </div>
        )}
        {showAppInput && (
          <div className={styles.boostAmountInputRow}>
            <div className={styles.boostAmountInputControl}>
              <TextInputNumber
                eyebrow={tValue('send_to.app', { brand_name: brandName })}
                stepperAriaLabels={{
                  decrement: tMisc('decrement'),
                  increment: tMisc('increment'),
                }}
                value={totalAmountToApp}
                min={0}
                step={
                  boostCurrencyFormatMetadata !== null
                    ? Number(boostCurrencyFormatMetadata.inputStep)
                    : 1
                }
                onChange={(e) => {
                  if (boostCurrencyFormatMetadata === null) {
                    const parsedAmount = parseBoostAmountInput(e.target.value);
                    if (parsedAmount !== null) {
                      setTotalAmountToApp(parsedAmount);
                      setAppAmountInputError(undefined);
                    }
                    return;
                  }

                  if (e.target.value.trim() === '') {
                    setTotalAmountToApp(0);
                    setAppAmountInputError(undefined);
                    return;
                  }

                  const parsed = parseMajorUnitToMinorAmount(
                    e.target.value,
                    boostCurrencyFormatMetadata.currency
                  );
                  const parsedAmount = parsed.ok ? parsed.minorAmount : null;
                  if (parsedAmount !== null) {
                    setTotalAmountToApp(parsedAmount);
                    setAppAmountInputError(undefined);
                    return;
                  }
                  setAppAmountInputError(
                    getAmountInputErrorMessage(
                      parsed,
                      boostCurrencyFormatMetadata.currency,
                      boostCurrencyFormatMetadata.minorUnitExponent
                    )
                  );
                }}
                sideText={
                  boostCurrencyFormatMetadata?.canonicalAmountUnit ??
                  (denominationTypeKey
                    ? tValue(`types.${denominationTypeKey}.denomination`)
                    : undefined)
                }
                prefix={boostCurrencyFormatMetadata?.symbolPrefix ?? undefined}
                infoError={appAmountInputError}
                disabled={isSubmitting || hasStatusUpdates || !isLoggedIn}
              />
            </div>
            {appBaselineEstimate ? (
              <EstimateWithTooltip
                estimateText={appBaselineEstimate}
                tooltipText={tValue('boost_messages.baseline_estimate_tooltip_text')}
              />
            ) : null}
          </div>
        )}
      </div>
      {showNameAndMessage && (
        <>
          {mbrssV1SenderBlockedPreflightMessage !== null &&
            mbrssV1SenderBlockedPreflightMessage !== '' && (
              <p className={styles.mbrssV1CapabilityError} role="alert">
                {mbrssV1SenderBlockedPreflightMessage}
              </p>
            )}
          {mbrssV1CapabilityFailed && (
            <p className={styles.mbrssV1CapabilityError} role="status">
              {tValue('boost_messages.mbrssV1_capability_unavailable')}
            </p>
          )}
          <TextInput
            eyebrow={tValue('your_name')}
            value={yourName}
            placeholder={tMisc('anonymous')}
            onChange={(e) => setYourName(e.target.value)}
            disabled={nameMessageFieldsDisabled}
          />
          <FormTextArea
            eyebrow={tValue('message')}
            value={message}
            placeholder={tMisc('optional')}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={messageMaxLength}
            disabled={nameMessageFieldsDisabled}
            showLoadingOverlay={mbrssV1MessageLoading}
            loadingOverlayStatusText={tValue('boost_messages.mbrssV1_capability_loading_status')}
            footerLeftContent={
              metaBoost && onToggleMetaBoostInfo ? (
                <Button
                  type="button"
                  variant="link"
                  className={styles.metaBoostInfoToggle}
                  onClick={onToggleMetaBoostInfo}
                  disabled={nameMessageFieldsDisabled}
                >
                  {showMetaBoostInfo ? tMisc('hide_info') : tMisc('more_info')}
                </Button>
              ) : undefined
            }
          />
        </>
      )}
    </StackForm>
  );
};
