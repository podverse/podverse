import { loggerService } from '@api/factories/loggerService.js';

import type { AccountSignupMode } from '@podverse/helpers';
import {
  ACCOUNT_SIGNUP_MODE_VALUES,
  isValidServerEnv,
  isValidUUID,
  SERVER_ENV_VALUES,
} from '@podverse/helpers';
import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  validateConditionalOptional,
  validateOptional,
  validateOptionalAbsoluteHttpUrlIfSet,
  validateRequired,
} from '@podverse/helpers-config';

/** MetaBoost AppAssertion: optional, but if one signing var is set the other is required. */
const validateMetaboostAppAssertionPair = (): ValidationResult[] => {
  const trimEnv = (name: string): string => (process.env[name] ?? '').trim();
  const pem = trimEnv('METABOOST_SIGNING_KEY_PEM');
  const iss = trimEnv('METABOOST_APP_ASSERTION_ISS');
  const pemSet = pem !== '';
  const issSet = iss !== '';

  if (!pemSet && !issSet) {
    return [
      {
        name: 'METABOOST_SIGNING_KEY_PEM / METABOOST_APP_ASSERTION_ISS',
        isSet: false,
        isValid: true,
        isRequired: false,
        message: 'Skipped (MetaBoost AppAssertion optional)',
        category: 'MetaBoost',
      },
    ];
  }

  if (pemSet && issSet) {
    return [
      {
        name: 'METABOOST_SIGNING_KEY_PEM',
        isSet: true,
        isValid: true,
        isRequired: false,
        message: 'Set',
        category: 'MetaBoost',
      },
      {
        name: 'METABOOST_APP_ASSERTION_ISS',
        isSet: true,
        isValid: true,
        isRequired: false,
        message: 'Set',
        category: 'MetaBoost',
      },
    ];
  }

  if (pemSet) {
    return [
      {
        name: 'METABOOST_APP_ASSERTION_ISS',
        isSet: false,
        isValid: false,
        isRequired: true,
        message: 'Required when METABOOST_SIGNING_KEY_PEM is set',
        category: 'MetaBoost',
      },
    ];
  }

  return [
    {
      name: 'METABOOST_SIGNING_KEY_PEM',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Required when METABOOST_APP_ASSERTION_ISS is set',
      category: 'MetaBoost',
    },
  ];
};

/**
 * Validates critical environment variables and configuration at application startup.
 * This function runs early in the initialization process to catch configuration errors
 * before the application attempts to start serving requests.
 *
 * @throws Error if any critical validation fails
 */
export const validateStartupRequirements = (): void => {
  loggerService.info('Running startup validation...');

  const summary = validateAllEnvironmentVariables();
  displayValidationResults(summary);

  if (summary.requiredMissing > 0) {
    const errorMessage = `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`;
    loggerService.error(errorMessage);
    // Throw error - stack trace will be suppressed in index.ts for validation errors
    throw new Error(errorMessage);
  }

  loggerService.info('Startup validation completed successfully');
};

/**
 * Validates all environment variables and returns a comprehensive summary
 */
const validateAllEnvironmentVariables = (): ValidationSummary => {
  const results: ValidationResult[] = [];

  // Validate signup mode first (required) before using it to determine conditional requirements
  const signupModeResult = validateSignupMode();
  results.push(signupModeResult);

  // Get signup mode to determine conditional requirements
  // If validation fails, we'll still check the env var (validation error will be caught later)
  // This allows us to properly validate conditional requirements based on the actual value
  const signupMode = (process.env.ACCOUNT_SIGNUP_MODE || '') as AccountSignupMode;
  const usesEmailFlows = signupMode === 'user_signup_email' || signupMode === 'admin_only_email';

  // Auth & Security
  results.push(validateJwtSecret());
  results.push(
    validateOptional(
      'AUTH_JWT_EXPIRATION',
      'Auth & Security',
      'Blank uses default (31536000 seconds)'
    )
  );
  results.push(
    validateOptional(
      'AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY',
      'Auth & Security',
      'Blank/false: omit token from login JSON; true: allow token when client sends includeTokenInResponseBody'
    )
  );
  results.push(validateRequired('BRAND_NAME', 'Auth & Security'));
  results.push(validateUserAgent());

  // Database (from podverse-orm, but validated here)
  results.push(validateRequired('DB_HOST', 'App database'));
  results.push(validateRequired('DB_PORT', 'App database'));
  results.push(validateRequired('DB_APP_NAME', 'App database'));
  results.push(validateRequired('DB_APP_READ_USER', 'App database'));
  results.push(validateRequired('DB_APP_READ_PASSWORD', 'App database'));
  results.push(validateRequired('DB_APP_READ_WRITE_USER', 'App database'));
  results.push(validateRequired('DB_APP_READ_WRITE_PASSWORD', 'App database'));
  results.push(validateOptional('DB_SSL_CONNECTION', 'App database', 'Use Default (false)'));

  // API Configuration
  results.push(validateRequired('API_PORT', 'API'));
  results.push(validateRequired('API_PREFIX', 'API'));
  results.push(validateRequired('API_VERSION', 'API'));
  results.push(validateRequired('COOKIE_DOMAIN', 'API'));
  results.push(validateRequired('API_ALLOWED_CORS_ORIGINS', 'API'));

  // Web
  results.push(validateRequired('WEB_PROTOCOL', 'Web'));
  results.push(validateRequired('WEB_DOMAIN', 'Web'));
  results.push(validateOptionalAbsoluteHttpUrlIfSet('WEB_ICON_IMAGE_PATH', 'Web'));

  // Message Queue
  results.push(validateRequired('MESSAGE_QUEUE_PROTOCOL', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_HOST', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_USERNAME', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_PASSWORD', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_PORT', 'Message Queue'));

  // Key-Value DB
  results.push(validateRequired('KEYVALDB_HOST', 'KeyValDB'));
  results.push(validateRequired('KEYVALDB_PORT', 'KeyValDB'));
  results.push(validateRequired('KEYVALDB_PASSWORD', 'KeyValDB'));
  results.push(validateRequired('KEYVALDB_CACHE_EXPIRATION', 'KeyValDB'));

  // Podcast Index
  results.push(validateRequired('PODCAST_INDEX_AUTH_KEY', 'Podcast Index'));
  results.push(validateRequired('PODCAST_INDEX_BASE_URL', 'Podcast Index'));
  results.push(validateRequired('PODCAST_INDEX_SECRET_KEY', 'Podcast Index'));

  // Add-by-RSS (required: Basic Auth credentials encrypted at rest)
  results.push(validateRequired('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY', 'Add-by-RSS'));

  // Premium/Membership
  // Note: validateSignupMode() is called earlier to determine conditional requirements
  results.push(validateOptional('PREMIUM_MEMBERSHIP_COST_MONTHLY', 'Premium'));
  results.push(validateOptional('PREMIUM_MEMBERSHIP_COST_ANNUALLY', 'Premium'));
  results.push(validateOptional('FREE_TRIAL_EXPIRATION', 'Premium'));

  // Mailer (conditionally required when signup mode uses email flows)
  if (usesEmailFlows) {
    results.push(validateRequired('MAILER_HOST', 'Mailer'));
    results.push(validateRequired('MAILER_PORT', 'Mailer'));
    results.push(validateRequired('MAILER_USERNAME', 'Mailer'));
    results.push(validateRequired('MAILER_PASSWORD', 'Mailer'));
    results.push(validateRequired('MAILER_FROM', 'Mailer'));
  } else {
    const mailerHost = validateConditionalOptional('MAILER_HOST', 'Mailer');
    if (mailerHost) {
      results.push(mailerHost);
    }
    const mailerPort = validateConditionalOptional('MAILER_PORT', 'Mailer');
    if (mailerPort) {
      results.push(mailerPort);
    }
    const mailerUsername = validateConditionalOptional('MAILER_USERNAME', 'Mailer');
    if (mailerUsername) {
      results.push(mailerUsername);
    }
    const mailerPassword = validateConditionalOptional('MAILER_PASSWORD', 'Mailer');
    if (mailerPassword) {
      results.push(mailerPassword);
    }
    const mailerFrom = validateConditionalOptional('MAILER_FROM', 'Mailer');
    if (mailerFrom) {
      results.push(mailerFrom);
    }
  }

  // Email Configuration (conditionally required when signup mode uses email flows)
  if (usesEmailFlows) {
    results.push(validateRequired('BRAND_COLOR_PRIMARY', 'Brand'));
    results.push(validateRequired('BRAND_BANNER_IMAGE_3X1_URL', 'Email Config'));
    results.push(validateRequired('LEGAL_NAME', 'Legal'));
    results.push(validateRequired('LEGAL_ADDRESS', 'Legal'));
  } else {
    const brandColor = validateConditionalOptional('BRAND_COLOR_PRIMARY', 'Brand');
    if (brandColor) {
      results.push(brandColor);
    }
    const brandBannerImage3x1Url = validateConditionalOptional(
      'BRAND_BANNER_IMAGE_3X1_URL',
      'Email Config'
    );
    if (brandBannerImage3x1Url) {
      results.push(brandBannerImage3x1Url);
    }
    const legalName = validateConditionalOptional('LEGAL_NAME', 'Legal');
    if (legalName) {
      results.push(legalName);
    }
    const legalAddress = validateConditionalOptional('LEGAL_ADDRESS', 'Legal');
    if (legalAddress) {
      results.push(legalAddress);
    }
  }

  // Social Media (optional - used when signup mode uses email flows but not required)
  results.push(validateOptional('SOCIAL_FACEBOOK_IMAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_FACEBOOK_PAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_GITHUB_IMAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_GITHUB_PAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_TWITTER_IMAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_TWITTER_PAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_REDDIT_IMAGE_URL', 'Social Media'));
  results.push(validateOptional('SOCIAL_REDDIT_PAGE_URL', 'Social Media'));

  // Token Expiration (conditionally required when signup mode uses email flows)
  if (usesEmailFlows) {
    results.push(validateRequired('VERIFY_EMAIL_TOKEN_EXPIRATION', 'Token Expiration'));
    results.push(
      validateRequired('EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION', 'Token Expiration')
    );
    results.push(validateRequired('RESET_PASSWORD_TOKEN_EXPIRATION', 'Token Expiration'));
  } else {
    const verifyEmailTokenExp = validateConditionalOptional(
      'VERIFY_EMAIL_TOKEN_EXPIRATION',
      'Token Expiration'
    );
    if (verifyEmailTokenExp) {
      results.push(verifyEmailTokenExp);
    }
    const emailChangeTokenExp = validateConditionalOptional(
      'EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION',
      'Token Expiration'
    );
    if (emailChangeTokenExp) {
      results.push(emailChangeTokenExp);
    }
    const resetPasswordTokenExp = validateConditionalOptional(
      'RESET_PASSWORD_TOKEN_EXPIRATION',
      'Token Expiration'
    );
    if (resetPasswordTokenExp) {
      results.push(resetPasswordTokenExp);
    }
  }

  // PayPal (optional, but validated)
  results.push(validateOptional('PAYPAL_CLIENT_ID', 'PayPal'));
  results.push(validateOptional('PAYPAL_CLIENT_SECRET', 'PayPal'));

  // MetaBoost AppAssertion (optional pair)
  results.push(...validateMetaboostAppAssertionPair());

  // Defaults
  results.push(validateRequired('DEFAULT_ACCOUNT_SETTINGS_LOCALE', 'Defaults'));

  // General
  results.push(validateOptional('NODE_ENV', 'General'));
  results.push(validateServerEnv());
  results.push(validateOptional('LOG_LEVEL', 'General'));
  results.push(
    validateOptional('LOG_DIR', 'General', 'Optional - empty for localhost, set for file logging')
  );

  // Calculate summary
  const total = results.length;
  const passed = results.filter((r) => r.isValid && r.isSet).length;
  const failed = results.filter((r) => !r.isValid).length;
  const requiredMissing = results.filter((r) => r.isRequired && !r.isValid).length;
  // Count as skipped all optional variables that are not set (regardless of message)
  const skipped = results.filter((r) => !r.isRequired && !r.isSet).length;
  // Count defaults used (passed validations with "Use Default" or "Blank" messages)
  const defaultsUsed = results.filter(
    (r) => r.isValid && r.isSet && (r.message.includes('Use Default') || r.message === 'Blank')
  ).length;

  return {
    total,
    passed,
    failed,
    requiredMissing,
    skipped,
    defaultsUsed,
    results,
  };
};

/**
 * Validates the AUTH_JWT_SECRET environment variable.
 * The JWT secret MUST be a valid UUID to ensure secure token generation.
 */
const validateJwtSecret = (): ValidationResult => {
  const jwtSecret = process.env.AUTH_JWT_SECRET || '';

  if (!jwtSecret) {
    return {
      name: 'AUTH_JWT_SECRET',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing - must be a valid UUID',
      category: 'Auth & Security',
    };
  }

  if (!isValidUUID(jwtSecret)) {
    return {
      name: 'AUTH_JWT_SECRET',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid UUID format: "${jwtSecret}"`,
      category: 'Auth & Security',
    };
  }

  return {
    name: 'AUTH_JWT_SECRET',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: 'Valid UUID',
    category: 'Auth & Security',
  };
};

const USER_AGENT_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/;

/**
 * Validates `USER_AGENT` (required, non-blank; no inference from `BRAND_NAME`).
 * Format: `BrandName Bot Environment/AppName/Version`, e.g. `Example Bot/API/5`
 */
const validateUserAgent = (): ValidationResult => {
  const raw = (process.env.USER_AGENT ?? '').trim();
  if (raw === '') {
    return {
      name: 'USER_AGENT',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing (required)',
      category: 'Auth & Security',
    };
  }

  if (!USER_AGENT_PATTERN.test(raw)) {
    return {
      name: 'USER_AGENT',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid format: "${raw}" - must follow format: BrandName Bot Environment/AppName/Version`,
      category: 'Auth & Security',
    };
  }

  const firstPart = raw.split('/')[0];
  if (firstPart && !firstPart.includes('Bot')) {
    return {
      name: 'USER_AGENT',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Missing "Bot" in first part: "${raw}"`,
      category: 'Auth & Security',
    };
  }

  return {
    name: 'USER_AGENT',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: 'Valid format',
    category: 'Auth & Security',
  };
};

/**
 * Validates SERVER_ENV
 */
const validateServerEnv = (): ValidationResult => {
  const serverEnv = process.env.SERVER_ENV || '';

  // Fallback values in case import fails (should match podverse-helpers)
  const validEnvs = SERVER_ENV_VALUES || ['prod', 'beta', 'alpha', 'local'];
  const validateEnv =
    isValidServerEnv ||
    ((value: string) => validEnvs.includes(value as (typeof validEnvs)[number]));

  if (!serverEnv) {
    return {
      name: 'SERVER_ENV',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: `Missing - must be one of: ${validEnvs.join(', ')}`,
      category: 'General',
    };
  }

  if (!validateEnv(serverEnv)) {
    return {
      name: 'SERVER_ENV',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid value: "${serverEnv}" - must be one of: ${validEnvs.join(', ')}`,
      category: 'General',
    };
  }

  return {
    name: 'SERVER_ENV',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Set to "${serverEnv}"`,
    category: 'General',
  };
};

/**
 * Validates ACCOUNT_SIGNUP_MODE
 * This is a required environment variable with no default value.
 * Valid values are: 'admin_only_username', 'admin_only_email', 'user_signup_email'
 */
const validateSignupMode = (): ValidationResult => {
  const signupMode = process.env.ACCOUNT_SIGNUP_MODE || '';
  const validModes: AccountSignupMode[] = [...ACCOUNT_SIGNUP_MODE_VALUES];

  if (!signupMode) {
    return {
      name: 'ACCOUNT_SIGNUP_MODE',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: `Missing - must be one of: ${validModes.map((m) => `"${m}"`).join(', ')}`,
      category: 'Premium/Membership',
    };
  }

  if (!validModes.includes(signupMode as AccountSignupMode)) {
    return {
      name: 'ACCOUNT_SIGNUP_MODE',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid value: "${signupMode}" - must be one of: ${validModes.map((m) => `"${m}"`).join(', ')}`,
      category: 'Premium/Membership',
    };
  }

  return {
    name: 'ACCOUNT_SIGNUP_MODE',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Set to "${signupMode}"`,
    category: 'Premium/Membership',
  };
};

/**
 * Displays validation results in a formatted table
 */
const displayValidationResults = (summary: ValidationSummary): void => {
  loggerService.info('=== Environment Variable Validation ===');

  // Group results by category
  const byCategory = summary.results.reduce<Record<string, ValidationResult[]>>((acc, result) => {
    const category = result.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category]?.push(result);
    return acc;
  }, {});

  // List of conditionally required variables (required when signup mode uses email flows)
  const conditionallyRequiredVars = [
    'MAILER_HOST',
    'MAILER_PORT',
    'MAILER_USERNAME',
    'MAILER_PASSWORD',
    'MAILER_FROM',
    'BRAND_COLOR_PRIMARY',
    'BRAND_BANNER_IMAGE_3X1_URL',
    'LEGAL_NAME',
    'LEGAL_ADDRESS',
    'VERIFY_EMAIL_TOKEN_EXPIRATION',
    'EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION',
    'RESET_PASSWORD_TOKEN_EXPIRATION',
  ];

  // Display by category
  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    loggerService.info(`[${category}]`);
    const categoryResults = byCategory[category] ?? [];
    for (const result of categoryResults) {
      const status = result.isValid ? '✓' : '✗';
      let requiredText = '';
      if (result.isRequired) {
        if (conditionallyRequiredVars.includes(result.name)) {
          requiredText = ' (required when signup mode uses email flows)';
        }
        // No text for always-required vars - lack of parentheses indicates required
      } else {
        requiredText = ' (optional)';
      }
      const logMessage = `  ${status} ${result.name}${requiredText} - ${result.message}`;
      // Log failures as errors, skipped optional vars as warn, passes as info
      if (!result.isValid) {
        loggerService.error(logMessage);
      } else if (!result.isSet && !result.isRequired) {
        loggerService.warn(logMessage);
      } else {
        loggerService.info(logMessage);
      }
    }
  }

  // Display summary
  loggerService.info('=== Validation Summary ===');
  loggerService.info(`Total: ${summary.total}`);
  const passedText =
    summary.defaultsUsed > 0
      ? `Passed: ${summary.passed} (${summary.defaultsUsed} using defaults)`
      : `Passed: ${summary.passed}`;
  loggerService.info(passedText);
  loggerService.info(`Skipped: ${summary.skipped}`);
  loggerService.info(`Failed: ${summary.failed}`);
  loggerService.info(`Required Missing: ${summary.requiredMissing}`);

  if (summary.failed > 0) {
    loggerService.error('The following environment variables failed validation:');
    summary.results
      .filter((r) => !r.isValid)
      .forEach((r) => {
        const requiredText = r.isRequired ? ' (required)' : ' (optional)';
        loggerService.error(`  - ${r.name}${requiredText}: ${r.message}`);
      });
  }

  if (summary.skipped > 0) {
    loggerService.info('Skipped optional variables (not set):');
    summary.results
      .filter((r) => !r.isRequired && !r.isSet)
      .forEach((r) => loggerService.info(`  - ${r.name}`));
  }
};
