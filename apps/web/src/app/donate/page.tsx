'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { FaCommentDollar } from 'react-icons/fa6';

import { BoostAppDonateForm } from '../../components/Boost/BoostAppDonateForm';
import { BoostMessagesSection } from '../../components/Boost/messages/BoostMessagesSection';
import { createBoostMessagesPageFetcher } from '../../components/Boost/messages/fetchPublicBoostMessages';
import { Divider } from '../../components/Divider/Divider';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { useConfig } from '../../contexts/Config';
import { getAppValueMetaBoost } from '../../utils/value/metaBoost';

import styles from '../../styles/app/donate/Donate.module.scss';

export default function DonatePage() {
  const config = useConfig();
  const [donationSucceeded, setDonationSucceeded] = useState(false);
  const [messagesRefreshTrigger, setMessagesRefreshTrigger] = useState(0);
  const tDonate = useTranslations('donate');

  const appValueMetaBoost = useMemo(() => getAppValueMetaBoost(config), [config]);
  const donateMessagesPageFetcher = useMemo(() => {
    if (appValueMetaBoost === null || appValueMetaBoost.standard !== 'mb-v1') {
      return null;
    }
    return createBoostMessagesPageFetcher({
      type: 'mb-v1',
      metaBoost: appValueMetaBoost,
    });
  }, [appValueMetaBoost]);

  return (
    <>
      <MainHeader title={tDonate('title')} />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <div>
              {!donationSucceeded && (
                <div className={styles.intro}>
                  <p>{tDonate('app_donation_notice', { brand_name: config.public.brand.name })}</p>
                  <p className={styles.boostHint}>
                    <span>{tDonate('creator_donation_hint_prefix')}</span>
                    <span className={styles.boostIcon} aria-hidden="true">
                      <FaCommentDollar />
                    </span>
                    <span>{tDonate('creator_donation_hint_suffix')}</span>
                  </p>
                </div>
              )}
              <BoostAppDonateForm
                onDonationSuccess={() => {
                  setDonationSucceeded(true);
                  setMessagesRefreshTrigger((previous) => previous + 1);
                }}
              />
              {donateMessagesPageFetcher !== null && (
                <div className={styles.messagesWrapper}>
                  <Divider className={styles.messagesDivider} />
                  <BoostMessagesSection
                    heading={tDonate('boost_messages_heading')}
                    pageFetcher={donateMessagesPageFetcher}
                    className={styles.messagesSection}
                    refreshTrigger={messagesRefreshTrigger}
                  />
                </div>
              )}
            </div>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
