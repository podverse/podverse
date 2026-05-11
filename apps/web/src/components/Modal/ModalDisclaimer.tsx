'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { Button, Modal, TextCheckboxes } from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useModals } from '../../contexts/Modals';
import { shouldShowServerEnvironmentDisclaimer } from './serverEnvironmentDisclaimer';

import styles from '../../styles/components/Modal/ModalDisclaimer.module.scss';

type ModalDisclaimerProps = {
  isOpen: boolean;
};

export const ModalDisclaimer: React.FC<ModalDisclaimerProps> = ({ isOpen }) => {
  const config = useConfig();
  const server_env = config.public.server_env;

  if (!shouldShowServerEnvironmentDisclaimer(server_env)) {
    return null;
  }

  const tDisclaimers = useTranslations('disclaimers');
  const tMisc = useTranslations('misc');
  const { modalDisclaimer, setModalDisclaimer } = useModals();
  const { setServerEnvironmentDisclaimerAccepted } = useLocalSettings();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  useEffect(() => {
    setModalDisclaimer({ isOpen });
  }, []);

  const handleContinue = () => {
    setServerEnvironmentDisclaimerAccepted(true);
    setModalDisclaimer({ isOpen: false });
  };

  const checkboxOptions = [{ label: tMisc('i_have_read_and_agree'), value: 'agree' }];

  return (
    <Modal
      isOpen={modalDisclaimer.isOpen}
      header={tDisclaimers(`environment_warning.${server_env}.header`)}
      ariaLabel={tDisclaimers(`environment_warning.${server_env}.header`)}
    >
      <div>
        <p className={styles.message}>
          {tDisclaimers(`environment_warning.${server_env}.message`)}
        </p>
        <TextCheckboxes
          name="disclaimer-checkbox"
          options={checkboxOptions}
          selectedValues={selectedValues}
          onChange={setSelectedValues}
        />
        <div className={styles.buttonWrapper}>
          <Button onClick={handleContinue} disabled={selectedValues.length === 0}>
            {tMisc('continue')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
