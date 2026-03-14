'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FaCommentDollar } from 'react-icons/fa6';

import { BoostAppDonateForm } from '../../components/Boost/BoostAppDonateForm';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { useConfig } from '../../contexts/Config';

import styles from '../../styles/app/donate/Donate.module.scss';

export default function DonatePage() {
  const config = useConfig();
  const [donationSucceeded, setDonationSucceeded] = useState(false);
  const tDonate = useTranslations('donate');

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
              <BoostAppDonateForm onDonationSuccess={() => setDonationSucceeded(true)} />
            </div>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
