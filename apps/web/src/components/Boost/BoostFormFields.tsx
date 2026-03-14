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
  tValue: Translator;
  tMisc: Translator;
  brandName: string;
  metaBoost?: MetaBoost | null;
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
  tValue,
  tMisc,
  brandName,
  metaBoost = null,
  showMetaBoostInfo = false,
  onToggleMetaBoostInfo,
}: BoostFormFieldsProps) => (
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
          sideText={selectedValueKey ? tValue(`types.${selectedValueKey}.denomination`) : undefined}
          disabled={isSubmitting || hasStatusUpdates}
        />
      )}
      {showAppInput && (
        <TextInputNumber
          eyebrow={tValue('send_to.app', { brand_name: brandName })}
          value={totalAmountToApp}
          min={0}
          onChange={(e) => setTotalAmountToApp(Number(e.target.value))}
          sideText={selectedValueKey ? tValue(`types.${selectedValueKey}.denomination`) : undefined}
          disabled={isSubmitting || hasStatusUpdates}
        />
      )}
    </div>
    {showNameAndMessage && (
      <>
        <TextInput
          eyebrow={tValue('your_name')}
          value={yourName}
          placeholder={tMisc('anonymous')}
          onChange={(e) => setYourName(e.target.value)}
          disabled={isSubmitting || hasStatusUpdates}
        />
        <TextArea
          eyebrow={tValue('message')}
          value={message}
          placeholder={tMisc('optional')}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          disabled={isSubmitting || hasStatusUpdates}
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
