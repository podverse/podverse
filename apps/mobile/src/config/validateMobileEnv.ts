import type { ValidationResult } from '@podverse/helpers/configValidation';
import { validateAbsoluteHttpUrlValue } from '@podverse/helpers/configValidation';

import type { MobileApiEnvVarName } from './env';
import { isMobileE2eFromEnv, selectMobileApiBaseUrl } from './env';
import { parseMobileApiConnection } from './parseApiConnection';

const validateDerivedApiPath = (
  apiBaseUrl: string,
  sourceEnvVarName: MobileApiEnvVarName
): ValidationResult => {
  const connection = parseMobileApiConnection(apiBaseUrl);

  if (connection === null) {
    return {
      category: 'Mobile API',
      isRequired: false,
      isSet: true,
      isValid: false,
      message:
        'Must be an absolute URL whose path ends with /api/<version> (e.g. http://localhost:4230/api/v2)',
      name: sourceEnvVarName,
    };
  }

  return {
    category: 'Mobile API',
    isRequired: false,
    isSet: true,
    isValid: true,
    message: `Set (${connection.prefix}${connection.version})`,
    name: sourceEnvVarName,
  };
};

export const validateMobileApiEnv = (): ValidationResult[] => {
  const selectedBaseUrl = selectMobileApiBaseUrl();

  const baseUrlValidation = validateAbsoluteHttpUrlValue(
    selectedBaseUrl.value,
    selectedBaseUrl.sourceEnvVarName,
    'Mobile API',
    {
      notSetMessage: 'Skipped - UI-only mode',
      required: false,
    }
  );

  if (!baseUrlValidation.isValid || !baseUrlValidation.isSet || selectedBaseUrl.value === null) {
    return [baseUrlValidation];
  }

  return [
    baseUrlValidation,
    validateDerivedApiPath(selectedBaseUrl.value, selectedBaseUrl.sourceEnvVarName),
  ];
};

export const assertMobileApiEnvOrWarn = (sourceEnvVarName: MobileApiEnvVarName): boolean => {
  const validations = validateMobileApiEnv();
  const failures = validations.filter((validation) => !validation.isValid);

  if (failures.length === 0) {
    return true;
  }

  for (const failure of failures) {
    console.error(`[mobile-env] ${failure.name}: ${failure.message}`);
  }

  if (isMobileE2eFromEnv()) {
    throw new Error(
      `[mobile-env] Invalid ${sourceEnvVarName}. Fix EXPO_PUBLIC_MOBILE_API_BASE_URL[_IOS|_ANDROID] before running E2E.`
    );
  }

  return false;
};
