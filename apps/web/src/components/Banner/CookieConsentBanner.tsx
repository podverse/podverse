'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@podverse/ui';
import type { ButtonVariant } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import type { CookieConsentChoice } from '../../utils/localSettings/localSettings';
import { Link } from '../Link/Link';

import styles from '../../styles/components/Banner/CookieConsentBanner.module.scss';

type ConsentChoiceConfig = {
  choice: CookieConsentChoice;
  labelKey: 'accept_all' | 'essential_only' | 'none';
  helpKey: 'accept_all_help' | 'essential_only_help' | 'none_help';
  variant: ButtonVariant;
};

const CONSENT_CHOICES: ConsentChoiceConfig[] = [
  {
    choice: 'all',
    labelKey: 'accept_all',
    helpKey: 'accept_all_help',
    variant: 'miniSubtleAccent',
  },
  {
    choice: 'essential',
    labelKey: 'essential_only',
    helpKey: 'essential_only_help',
    variant: 'miniSubtle',
  },
  {
    choice: 'none',
    labelKey: 'none',
    helpKey: 'none_help',
    variant: 'miniSubtle',
  },
];

export const CookieConsentBanner = () => {
  const config = useConfig();
  const { cookieConsent, setCookieConsent } = useLocalSettings();
  const t = useTranslations('cookie_consent');

  if (!config.public.cookieConsent.bannerEnabled || cookieConsent !== undefined) {
    return null;
  }

  const handleChoice = (choice: CookieConsentChoice) => {
    setCookieConsent(choice);
  };

  return (
    <div className={styles.root} role="region" aria-labelledby="cookie-consent-message">
      <p className={styles.message} id="cookie-consent-message">
        {t.rich('banner_message', {
          termsLink: (chunks) => <Link href={ROUTES.TERMS}>{chunks}</Link>,
        })}
      </p>
      <div className={styles.actions}>
        {CONSENT_CHOICES.map(({ choice, labelKey, helpKey, variant }) => {
          const helpId = `cookie-consent-help-${choice}`;
          return (
            <div className={styles.actionRow} key={choice}>
              <p className={styles.help} id={helpId}>
                {t(helpKey)}
              </p>
              <div className={styles.buttonSlot}>
                <Button
                  className={styles.consentButton}
                  variant={variant}
                  aria-describedby={helpId}
                  onClick={() => handleChoice(choice)}
                >
                  {t(labelKey)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
