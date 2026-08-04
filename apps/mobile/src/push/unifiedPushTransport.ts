import { getMobileConfig } from '../config';

export type UnifiedPushRegistrationPayload = {
  up_auth_key: string | null;
  up_endpoint: string;
};

const isUnifiedPushEnabled = (): boolean => {
  return getMobileConfig().pushProvider === 'unifiedpush';
};

export const getUnifiedPushRegistrationPayload = (): UnifiedPushRegistrationPayload | null => {
  if (!isUnifiedPushEnabled()) {
    return null;
  }

  const { unifiedPushAuthKey, unifiedPushEndpoint } = getMobileConfig();
  if (unifiedPushEndpoint === null || unifiedPushEndpoint === '') {
    return null;
  }

  return {
    up_auth_key: unifiedPushAuthKey,
    up_endpoint: unifiedPushEndpoint,
  };
};
