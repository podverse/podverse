import type { MetaBoost } from '@podverse/v4v-metaboost';

import { Button } from '../Button/Button';
import Form from '../Form/Form';
import { TextArea } from '../Form/TextArea';
import { TextInput } from '../Form/TextInput';
import TextInputNumber from '../Form/TextInputNumber';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type Translator = (key: string, values?: Record<string, string | number>) => string;

type BoostFormFieldsProps = {
  totalAmountToCreator: number;
  totalAmountToApp: number;
  setTotalAmountToCreator: (value: number) => void;
  setTotalAmountToApp: (value: number) => void;
  selectedValueKey: string | null;
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
  tValue: Translator;
  tMisc: Translator;
  brandName: string;
  metaBoost?: MetaBoost | null;
  /** When false and MetaBoost is set, name/message require login (mbrss-v1). */
  isLoggedIn: boolean;
  showMetaBoostInfo?: boolean;
  onToggleMetaBoostInfo?: () => void;
};

export const BoostFormFields = ({
  totalAmountToCreator,
  totalAmountToApp,
  setTotalAmountToCreator,
  setTotalAmountToApp,
  selectedValueKey,
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
  tValue,
  tMisc,
  brandName,
  metaBoost = null,
  isLoggedIn,
  showMetaBoostInfo = false,
  onToggleMetaBoostInfo,
}: BoostFormFieldsProps) => {
  const nameMessageFieldsDisabled =
    isSubmitting ||
    hasStatusUpdates ||
    mbrssV1MessageFieldBlocked ||
    (metaBoost !== null && !isLoggedIn);

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <div className={styles.boostAmountInputs}>
        {showCreatorInput && (
          <TextInputNumber
            eyebrow={tValue('send_to.creator')}
            value={totalAmountToCreator}
            min={0}
            onChange={(e) => setTotalAmountToCreator(Number(e.target.value))}
            sideText={
              selectedValueKey ? tValue(`types.${selectedValueKey}.denomination`) : undefined
            }
            disabled={isSubmitting || hasStatusUpdates}
          />
        )}
        {showAppInput && (
          <TextInputNumber
            eyebrow={tValue('send_to.app', { brand_name: brandName })}
            value={totalAmountToApp}
            min={0}
            onChange={(e) => setTotalAmountToApp(Number(e.target.value))}
            sideText={
              selectedValueKey ? tValue(`types.${selectedValueKey}.denomination`) : undefined
            }
            disabled={isSubmitting || hasStatusUpdates}
          />
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
          <TextArea
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
                >
                  {showMetaBoostInfo ? tMisc('hide_info') : tMisc('more_info')}
                </Button>
              ) : undefined
            }
          />
        </>
      )}
    </Form>
  );
};
