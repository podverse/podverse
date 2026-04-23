'use client';

import { useTranslations } from 'next-intl';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { BoostFormBase } from './BoostFormBase';
import { useBoostSelection } from './hooks/useBoostSelection';

type BoostFormProps = {
  channel: DTOChannel;
  item: DTOItem | null;
  className?: string;
};

export const BoostForm: React.FC<BoostFormProps> = ({ channel, item }) => {
  const tValue = useTranslations('value');
  const {
    buttonTabs,
    selectedChannelValue,
    selectedItemValue,
    selectedKey,
    selectedValueKey,
    metaBoost,
  } = useBoostSelection({ channel, item, tValue });

  return (
    <BoostFormBase
      channel={channel}
      item={item}
      buttonTabs={buttonTabs}
      selectedKey={selectedKey}
      selectedValueKey={selectedValueKey}
      selectedChannelValue={selectedChannelValue}
      selectedItemValue={selectedItemValue}
      metaBoost={metaBoost}
      boostPaymentScope="creator_only"
      showCreatorInput
      showAppInput={false}
      showAppRecipientInfo={false}
      showMediaHeader
    />
  );
};
