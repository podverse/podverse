'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { BoostFormBase } from './BoostFormBase';
import { useConfig } from '../../contexts/Config';

export const BoostAppDonateForm: React.FC = () => {
  const config = useConfig();
  const tValue = useTranslations('value');
  const [selectedKey, setSelectedKey] = useState<string>('');

  const appRecipientType = useMemo<'lnaddress' | 'node' | null>(() => {
    if (config.public.app_value.lightning_lnaddress?.address) {
      return 'lnaddress';
    }
    if (config.public.app_value.lightning_node?.address) {
      return 'node';
    }
    return null;
  }, [
    config.public.app_value.lightning_node?.address,
    config.public.app_value.lightning_lnaddress?.address,
  ]);

  useEffect(() => {
    if (!appRecipientType) return;
    if (selectedKey !== '') return;
    setSelectedKey('lightning');
  }, [appRecipientType, selectedKey]);

  const selectedValueKey = selectedKey !== '' ? selectedKey : null;

  const buttonTabs = [
    {
      key: 'lightning',
      label: tValue('types.lightning.label'),
      onClick: () => setSelectedKey('lightning'),
    },
  ];

  if (!appRecipientType || selectedValueKey === null) {
    return null;
  }

  return (
    <BoostFormBase
      channel={null}
      item={null}
      buttonTabs={buttonTabs}
      selectedKey={selectedKey}
      selectedValueKey={selectedValueKey}
      selectedChannelValue={undefined}
      selectedItemValue={undefined}
      metaBoost={null}
      includeCreatorRecipients={false}
      includeAppRecipient
      appRecipientType="lightning"
      appRecipientRecipientType={appRecipientType}
      showCreatorInput={false}
      showAppInput
      showAppRecipientInfo
      showMediaHeader={false}
      defaultTotalAmountToCreator={0}
      defaultTotalAmountToApp={1}
    />
  );
};
