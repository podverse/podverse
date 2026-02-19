'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

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
import { useModals } from '../../contexts/Modals';
import { useBoostPayments } from './hooks/useBoostPayments';
import { useBoostRecipients } from './hooks/useBoostRecipients';
import { useBoostSelection } from './hooks/useBoostSelection';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type BoostFormProps = {
  channel: DTOChannel;
  item: DTOItem | null;
  className?: string;
};

export const BoostForm: React.FC<BoostFormProps> = ({ className: _className, channel, item }) => {
  const config = useConfig();
  const { setModalBoostMessageError } = useModals();
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const [totalAmountToCreator, setTotalAmountToCreator] = useState<number>(1);
  const [totalAmountToApp, setTotalAmountToApp] = useState<number>(0);
  const [yourName, setYourName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    buttonTabs,
    selectedChannelValue,
    selectedItemValue,
    selectedKey,
    selectedMethod,
    selectedValueKey,
    metaBoost,
  } = useBoostSelection({ channel, item, tValue });

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
  });

  if (paymentRecipients.length === 0) {
    return null;
  }

  return (
    <div>
      <MediaHeaderMini channel={channel} item={item} />
      <ButtonTabs buttonTabs={buttonTabs} selectedKey={selectedKey} />
      {shouldShowBoostMessageNotice && <BoostMessageNotice tValue={tValue} />}
      <BoostRecipientStatusList recipientStatuses={recipientStatuses} tValue={tValue} />
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
      <div className={styles.buttons}>
        <Button onClick={handleSubmitBoost} isLoading={isSubmitting} disabled={isSubmitting}>
          {tMisc('submit')}
        </Button>
      </div>
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
        />
      </div>
    </div>
  );
};
