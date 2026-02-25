'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { BoostFormBase } from './BoostFormBase';
import { useConfig } from '../../contexts/Config';

/** Value key for app donate when lightning is configured (lnaddress or node). */
const APP_DONATE_LIGHTNING_KEY = 'lightning';

type BoostAppDonateFormProps = {
  onDonationSuccess?: () => void;
};

export const BoostAppDonateForm: React.FC<BoostAppDonateFormProps> = ({ onDonationSuccess }) => {
  const router = useRouter();
  const config = useConfig();
  const tValue = useTranslations('value');
  const tDonate = useTranslations('donate');
  const tMisc = useTranslations('misc');

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

  const defaultValueKey = useMemo<string>(() => {
    if (appRecipientType === null) return '';
    if (
      config.public.app_value.lightning_lnaddress?.address ||
      config.public.app_value.lightning_node?.address
    ) {
      return APP_DONATE_LIGHTNING_KEY;
    }
    return '';
  }, [
    appRecipientType,
    config.public.app_value.lightning_lnaddress?.address,
    config.public.app_value.lightning_node?.address,
  ]);

  const [selectedKey, setSelectedKey] = useState<string>(defaultValueKey);
  const selectedValueKey = selectedKey !== '' ? selectedKey : null;

  const buttonTabs = [
    {
      key: APP_DONATE_LIGHTNING_KEY,
      label: tValue('types.lightning.label'),
      onClick: () => setSelectedKey(APP_DONATE_LIGHTNING_KEY),
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
      onDonationSuccess={onDonationSuccess}
      successPrimaryButtonLabel={tMisc('return_to_home_page')}
      successPrimaryButtonOnClick={() => router.push('/')}
    />
  );
};
