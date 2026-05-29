'use client';

import { IntegrationsWebScripts } from '@podverse/integrations-web';

import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { cookieConsentAllowsWebAnalytics } from '../../lib/cookieConsent/cookieConsentPolicy';

export const ConsentGatedIntegrations = () => {
  const config = useConfig();
  const { cookieConsent } = useLocalSettings();

  if (
    cookieConsentAllowsWebAnalytics(config.public.cookieConsent.bannerEnabled, cookieConsent)
  ) {
    return <IntegrationsWebScripts integrations={config.integrations} />;
  }

  return null;
};
