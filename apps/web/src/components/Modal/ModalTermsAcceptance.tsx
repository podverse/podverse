'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Modal, TextCheckboxes } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';

import styles from '../../styles/components/Modal/ModalDisclaimer.module.scss';

type ModalTermsAcceptanceProps = {
  isOpen: boolean;
};

export const ModalTermsAcceptance = ({ isOpen }: ModalTermsAcceptanceProps) => {
  const config = useConfig();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const tTermsAcceptance = useTranslations('terms_acceptance');
  const tMisc = useTranslations('misc');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (loggedInAccount === null) {
    return null;
  }

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await getApiRequestService().reqAccountAcceptTerms({
        terms_version: config.public.legal.terms.version,
      });
      const updatedAccount = await getApiRequestService().reqAuthMe();
      setLoggedInAccount(updatedAccount);
      setSelectedValues([]);
    } catch (error) {
      console.error('Terms acceptance failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkboxOptions = [{ label: tTermsAcceptance('checkbox_label'), value: 'agree' }];

  return (
    <Modal
      isOpen={isOpen}
      header={tTermsAcceptance('header')}
      ariaLabel={tTermsAcceptance('header')}
    >
      <div>
        <p className={styles.message}>{tTermsAcceptance('message')}</p>
        <TextCheckboxes
          name="terms-acceptance-checkbox"
          options={checkboxOptions}
          selectedValues={selectedValues}
          onChange={setSelectedValues}
        />
        <div className={styles.buttonWrapper}>
          <Button
            onClick={handleContinue}
            disabled={selectedValues.length === 0 || isLoading}
            isLoading={isLoading}
          >
            {tMisc('continue')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
