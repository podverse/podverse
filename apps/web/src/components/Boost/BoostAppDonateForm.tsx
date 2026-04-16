'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useConfig } from '../../contexts/Config';
import { getAppValueMetaBoost } from '../../utils/value/metaBoost';
import { BoostFormBase } from './BoostFormBase';
import { DONATE_MBRSS_V1_RSS_CONTEXT } from './donateMbrssV1RssContext';

import styles from './BoostAppDonateForm.module.scss';

/** Value key for app donate when lightning is configured (lnaddress or node). */
const APP_DONATE_LIGHTNING_KEY = 'lightning';

type BoostAppDonateFormProps = {
  onDonationSuccess?: () => void;
};

export const BoostAppDonateForm: React.FC<BoostAppDonateFormProps> = ({ onDonationSuccess }) => {
  const router = useRouter();
  const config = useConfig();
  const tDonate = useTranslations('donate');
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');

  const appRecipientType = useMemo<'lnaddress' | 'node' | null>(() => {
    const hasLnaddress =
      Boolean(config.public.app_value.lightning_lnaddress?.address) &&
      Boolean(config.public.app_value.lightning_lnaddress?.name);
    const hasNode =
      Boolean(config.public.app_value.lightning_node?.address) &&
      Boolean(config.public.app_value.lightning_node?.name);

    if (hasLnaddress) {
      return 'lnaddress';
    }
    if (hasNode) {
      return 'node';
    }
    return null;
  }, [
    config.public.app_value.lightning_lnaddress?.address,
    config.public.app_value.lightning_lnaddress?.name,
    config.public.app_value.lightning_node?.address,
    config.public.app_value.lightning_node?.name,
  ]);

  const defaultValueKey = useMemo<string>(() => {
    if (appRecipientType === null) return '';
    return APP_DONATE_LIGHTNING_KEY;
  }, [appRecipientType]);

  const [selectedKey, setSelectedKey] = useState<string>(defaultValueKey);
  const selectedValueKey = selectedKey !== '' ? selectedKey : null;
  const appValueMetaBoost = useMemo(() => getAppValueMetaBoost(config), [config]);

  const buttonTabs = [
    {
      key: APP_DONATE_LIGHTNING_KEY,
      label: tValue('types.lightning.label'),
      onClick: () => setSelectedKey(APP_DONATE_LIGHTNING_KEY),
    },
  ];

  // Form is hidden when no app Lightning recipient is configured (LNAddress or Node env vars).
  if (appRecipientType === null) {
    return (
      <p className={styles.notConfigured}>
        {tDonate('app_not_configured', { brand_name: config.public.brand.name })}
      </p>
    );
  }
  if (selectedValueKey === null) {
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
      metaBoost={appValueMetaBoost}
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
      noRecipientsFallback={
        <p className={styles.notConfigured}>
          {tDonate('app_not_configured', { brand_name: config.public.brand.name })}
        </p>
      }
      mbrssV1RssContext={DONATE_MBRSS_V1_RSS_CONTEXT}
    />
  );
};
