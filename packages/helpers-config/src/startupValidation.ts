/* eslint-disable no-console */
import { isValidServerEnv, SERVER_ENV_VALUES, SUPPORTED_LOCALES } from '@podverse/helpers';

/**
 * Types and functions for validating environment variables at application startup.
 * These utilities can be used across different projects to validate required and optional environment variables.
 */

export type ValidationResult = {
  name: string;
  isSet: boolean;
  isValid: boolean;
  isRequired: boolean;
  message: string;
  category: string;
};

export type ValidationSummary = {
  total: number;
  passed: number;
  failed: number;
  requiredMissing: number;
  skipped: number;
  defaultsUsed: number;
  results: ValidationResult[];
};

/** True when the env var name denotes a TCP/UDP port (not e.g. OTEL_EXPORTER_*). */
export function isEnvVarPortName(varName: string): boolean {
  return varName === 'PORT' || varName.endsWith('_PORT');
}

/**
 * Validates a required environment variable
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @returns ValidationResult indicating whether the variable is set and valid
 */
export function validateRequired(varName: string, category: string): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  // Additional validation for numeric values
  if (isSet && (isEnvVarPortName(varName) || varName.endsWith('_EXPIRATION'))) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      return {
        name: varName,
        isSet: true,
        isValid: false,
        isRequired: true,
        message: `Invalid number: "${value}"`,
        category,
      };
    }
  }

  // Additional validation for API_ALLOWED_CORS_ORIGINS (should not be empty)
  if (varName === 'API_ALLOWED_CORS_ORIGINS' && isSet) {
    const origins = value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== '');
    if (origins.length === 0) {
      return {
        name: varName,
        isSet: true,
        isValid: false,
        isRequired: true,
        message: 'Empty - must contain at least one origin',
        category,
      };
    }
  }

  return {
    name: varName,
    isSet,
    isValid: isSet,
    isRequired: true,
    message: isSet ? 'Set' : 'Missing or empty',
    category,
  };
}

/**
 * Validates an optional environment variable
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @param defaultMessage - Optional message to display when variable is not set (defaults to "Skipped")
 * @returns ValidationResult indicating whether the variable is set and valid (optional vars are always valid even if not set)
 */
export function validateOptional(
  varName: string,
  category: string,
  defaultMessage: string = 'Skipped'
): ValidationResult {
  const value = process.env[varName] || '';
  const isSet = value !== '';

  // Additional validation for numeric values if set
  if (isSet && (isEnvVarPortName(varName) || varName.endsWith('_EXPIRATION'))) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      return {
        name: varName,
        isSet: true,
        isValid: false,
        isRequired: false,
        message: `Invalid number: "${value}"`,
        category,
      };
    }
  }

  return {
    name: varName,
    isSet,
    isValid: true, // Optional vars are always valid (even if not set)
    isRequired: false,
    message: isSet ? 'Set' : defaultMessage,
    category,
  };
}

const ABSOLUTE_HTTP_URL_RE = /^https?:\/\//i;

/**
 * Optional web branding image URL: if set, must be an absolute `http://` or `https://` URL
 * (so assets are not required to be bundled in the app image).
 */
export function validateOptionalAbsoluteHttpUrlIfSet(
  varName: string,
  category: string,
  notSetMessage: string = 'Skipped'
): ValidationResult {
  const raw = process.env[varName] || '';
  const value = raw.trim();
  if (value === '') {
    return {
      name: varName,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: notSetMessage,
      category,
    };
  }
  const ok = ABSOLUTE_HTTP_URL_RE.test(value);
  return {
    name: varName,
    isSet: true,
    isValid: ok,
    isRequired: false,
    message: ok ? 'Set' : 'Must be an absolute http:// or https:// URL',
    category,
  };
}

/**
 * Validates a conditionally optional environment variable (only logs if set but not needed)
 * Returns null if variable is not set (so it won't be included in results)
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @returns ValidationResult if variable is set, null otherwise
 */
export function validateConditionalOptional(
  varName: string,
  category: string
): ValidationResult | null {
  const value = process.env[varName] || '';
  const isSet = value !== '';

  // Only validate if the variable is set (if not set, don't include in results)
  if (!isSet) {
    return null;
  }

  // Additional validation for numeric values if set
  if (isEnvVarPortName(varName) || varName.endsWith('_EXPIRATION')) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      return {
        name: varName,
        isSet: true,
        isValid: false,
        isRequired: false,
        message: `Invalid number: "${value}"`,
        category,
      };
    }
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: false,
    message: 'Set (not needed when signup mode is disabled)',
    category,
  };
}

/**
 * Generates a validation error message for variables that accept "all-available" or comma-delimited list
 * @param validValues - Array of valid values that can be used in the comma-delimited list
 * @returns Error message string
 */
export function getAllAvailableOrListMessage(validValues: string[]): string {
  return `must be "all-available" or comma-delimited list (valid values: ${validValues.join(', ')})`;
}

/**
 * Displays validation results silently - only logs failures.
 * This is intended for modules (not apps) that should not show validation output unless there are errors.
 * @param summary - The validation summary to display
 */
export function isPodverseStartupValidationSilent(): boolean {
  return process.env.PODVERSE_STARTUP_VALIDATION_SILENT === '1';
}

export function displayValidationResultsSilent(summary: ValidationSummary): void {
  // Only log if there are failures
  if (summary.failed === 0 && summary.requiredMissing === 0) {
    return;
  }

  // Group results by category
  const byCategory = summary.results.reduce(
    (acc, result) => {
      const categoryResults = acc[result.category];
      if (!categoryResults) {
        acc[result.category] = [];
      }
      acc[result.category]?.push(result);
      return acc;
    },
    {} as Record<string, ValidationResult[]>
  );

  // Display failures by category
  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    const categoryResults = byCategory[category];
    const failures = categoryResults?.filter((r) => !r.isValid) ?? [];
    if (failures.length > 0) {
      console.error(`[${category}]`);
      for (const result of failures) {
        const requiredText = result.isRequired ? ' (required)' : ' (optional)';
        console.error(`  ✗ ${result.name}${requiredText} - ${result.message}`);
      }
    }
  }

  // Display summary of failures
  if (summary.failed > 0) {
    console.error('\n=== Validation Failures ===');
    console.error(`Failed: ${summary.failed}`);
    console.error(`Required Missing: ${summary.requiredMissing}`);

    if (summary.requiredMissing > 0) {
      console.error('\nThe following required environment variables are missing or invalid:');
      summary.results
        .filter((r) => r.isRequired && !r.isValid)
        .forEach((r) => {
          console.error(`  - ${r.name}: ${r.message}`);
        });
    }
  }
}

/**
 * Validates a single locale value against supported locales
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @param isRequired - Whether the variable is required (default: true)
 * @returns ValidationResult indicating whether the locale is valid
 */
export function validateLocale(
  varName: string,
  category: string,
  isRequired: boolean = true
): ValidationResult {
  const value = process.env[varName] || '';
  const isSet = value !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: !isRequired,
      isRequired,
      message: isRequired ? `Missing - must be one of: ${SUPPORTED_LOCALES.join(', ')}` : 'Skipped',
      category,
    };
  }

  const trimmedValue = value.trim();
  if (!SUPPORTED_LOCALES.includes(trimmedValue as (typeof SUPPORTED_LOCALES)[number])) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired,
      message: `Invalid locale: "${value}". Valid locales: ${SUPPORTED_LOCALES.join(', ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired,
    message: `Valid locale: ${trimmedValue}`,
    category,
  };
}

/**
 * Validates NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES
 * Must be "all-available" or comma-delimited list of valid locales
 * @param varName - The name of the environment variable to validate (defaults to 'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES')
 * @param category - The category/group this variable belongs to (for display purposes)
 * @returns ValidationResult indicating whether the supported locales list is valid
 */
export function validateSupportedLocalesList(
  varName: string = 'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES',
  category: string
): ValidationResult {
  const value = process.env[varName] || '';
  const isSet = value !== '';

  if (!isSet || value.trim() === '') {
    return {
      name: varName,
      isSet: false,
      isValid: false,
      isRequired: true,
      message: `Missing - ${getAllAvailableOrListMessage(SUPPORTED_LOCALES)}`,
      category,
    };
  }

  const trimmedValue = value.trim();

  // Allow "all-available" as a special value
  if (trimmedValue === 'all-available') {
    return {
      name: varName,
      isSet: true,
      isValid: true,
      isRequired: true,
      message: 'Set to "all-available"',
      category,
    };
  }

  // Validate comma-delimited list of locales
  const locales = trimmedValue
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  if (locales.length === 0) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Empty after parsing - ${getAllAvailableOrListMessage(SUPPORTED_LOCALES)}`,
      category,
    };
  }

  // Check that all locales are valid
  const invalidLocales = locales.filter(
    (locale) => !SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])
  );
  if (invalidLocales.length > 0) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid locale(s): ${invalidLocales.join(', ')}. Valid locales: ${SUPPORTED_LOCALES.join(', ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Valid locales: ${locales.join(', ')}`,
    category,
  };
}

/**
 * Validates an optional environment variable - if set, must not be empty
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @returns ValidationResult indicating whether the variable is valid (optional, but if set must not be empty)
 */
export function validateOptionalNonEmpty(varName: string, category: string): ValidationResult {
  const value = process.env[varName];

  // If not set at all (undefined), it's valid (optional)
  if (value === undefined || value === null) {
    return {
      name: varName,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Skipped',
      category,
    };
  }

  // If set but empty or only whitespace, it's invalid
  if (typeof value === 'string' && value.trim() === '') {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: false,
      message: 'Empty - if set, must not be empty',
      category,
    };
  }

  // If set and has a value, it's valid
  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: false,
    message: 'Set',
    category,
  };
}

/**
 * Validates a boolean environment variable - must be "true" or "false" if set
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @param isRequired - Whether the variable is required (default: false)
 * @param defaultValue - Optional default value message if not set (e.g., "Use Default (false)")
 * @returns ValidationResult indicating whether the boolean value is valid
 */
/**
 * Optional env boolean using common tokens: true/1/yes vs false/0/no.
 * Unset or blank → valid (treated as false at runtime).
 */
export function validateOptionalBooleanEnvToken(
  varName: string,
  category: string,
  notSetMessage: string = 'Use Default (false)'
): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: notSetMessage,
      category,
    };
  }

  const t = value.trim().toLowerCase();
  const ok = t === 'true' || t === '1' || t === 'yes' || t === 'false' || t === '0' || t === 'no';
  if (!ok) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: false,
      message: `Invalid value: "${value}" - use true/false, 1/0, or yes/no`,
      category,
    };
  }

  const on = t === 'true' || t === '1' || t === 'yes';
  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: false,
    message: on ? 'Strict KeyVal checks enabled' : 'Strict KeyVal checks disabled',
    category,
  };
}

export function validateBoolean(
  varName: string,
  category: string,
  isRequired: boolean = false,
  defaultValue?: string
): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: !isRequired,
      isRequired,
      message: defaultValue || (isRequired ? 'Missing - must be "true" or "false"' : 'Skipped'),
      category,
    };
  }

  const lowerValue = value.toLowerCase().trim();
  if (lowerValue !== 'true' && lowerValue !== 'false') {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired,
      message: `Invalid value: "${value}" - must be "true" or "false"`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired,
    message: `Set to ${lowerValue}`,
    category,
  };
}

/**
 * Validates WEB_PROTOCOL - must be "http" or "https" if set
 * @param varName - The name of the environment variable to validate (defaults to 'WEB_PROTOCOL')
 * @param category - The category/group this variable belongs to (for display purposes)
 * @param isRequired - Whether the variable is required (default: false)
 * @returns ValidationResult indicating whether the protocol is valid
 */
export function validateWebProtocol(
  varName: string = 'WEB_PROTOCOL',
  category: string,
  isRequired: boolean = false
): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: !isRequired,
      isRequired,
      message: isRequired ? 'Missing - must be "http" or "https"' : 'Skipped',
      category,
    };
  }

  const lowerValue = value.toLowerCase().trim();
  if (lowerValue !== 'http' && lowerValue !== 'https') {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired,
      message: `Invalid protocol: "${value}" - must be "http" or "https"`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired,
    message: `Set to ${lowerValue}`,
    category,
  };
}

/**
 * Validates LOG_LEVEL - must be a valid winston log level
 * @param varName - The name of the environment variable to validate (defaults to 'LOG_LEVEL')
 * @param category - The category/group this variable belongs to (for display purposes)
 * @param isRequired - Whether the variable is required (default: true)
 * @param validLevels - Optional array of valid log levels (defaults to winston levels)
 * @returns ValidationResult indicating whether the log level is valid
 */
export function validateLogLevel(
  varName: string = 'LOG_LEVEL',
  category: string,
  isRequired: boolean = true,
  validLevels: string[] = ['error', 'warn', 'info', 'debug', 'verbose', 'silly', 'silent']
): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: !isRequired,
      isRequired,
      message: isRequired
        ? `Missing or empty - must be a valid log level (${validLevels.join(', ')})`
        : 'Skipped',
      category,
    };
  }

  const lowerValue = value.toLowerCase().trim();
  if (!validLevels.includes(lowerValue)) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired,
      message: `Invalid log level: "${value}" - must be one of: ${validLevels.join(', ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired,
    message: `Valid log level: ${lowerValue}`,
    category,
  };
}

/**
 * Validates a positive number environment variable
 * @param varName - The name of the environment variable to validate
 * @param category - The category/group this variable belongs to (for display purposes)
 * @param isRequired - Whether the variable is required (default: false)
 * @param min - Optional minimum value (default: 1)
 * @param max - Optional maximum value (no limit if not specified)
 * @returns ValidationResult indicating whether the number is valid
 */
export function validatePositiveNumber(
  varName: string,
  category: string,
  isRequired: boolean = false,
  min: number = 1,
  max?: number
): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: !isRequired,
      isRequired,
      message: isRequired
        ? `Missing - must be a positive number${min > 1 ? ` (min: ${min})` : ''}${max ? ` (max: ${max})` : ''}`
        : 'Skipped',
      category,
    };
  }

  const numValue = Number(value);
  if (isNaN(numValue) || numValue < min || (max !== undefined && numValue > max)) {
    const rangeMsg = max !== undefined ? ` between ${min} and ${max}` : ` >= ${min}`;
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired,
      message: `Invalid number: "${value}" - must be a positive number${rangeMsg}`,
      category,
    };
  }

  const rangeMsg = max !== undefined ? ` (${min}-${max})` : ` (min: ${min})`;
  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired,
    message: `Valid number: ${numValue}${rangeMsg}`,
    category,
  };
}

/** Allowed values for ACCOUNT_SIGNUP_MODE / NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE */
const SIGNUP_MODES = ['admin_only_username', 'admin_only_email', 'user_signup_email'] as const;

/**
 * Validates signup mode - must be one of the three allowed values.
 */
export function validateSignupMode(varName: string, category: string): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: false,
      isRequired: true,
      message: `Missing - must be one of: ${SIGNUP_MODES.map((m) => `"${m}"`).join(' or ')}`,
      category,
    };
  }

  const trimmed = value.trim();
  if (!SIGNUP_MODES.includes(trimmed as (typeof SIGNUP_MODES)[number])) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid value: "${value}" - must be one of: ${SIGNUP_MODES.map((m) => `"${m}"`).join(' or ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Set to "${trimmed}"`,
    category,
  };
}

/**
 * Validates SERVER_ENV / NEXT_PUBLIC_SERVER_ENV using helpers constants.
 * Blank/empty is valid (disclaimer modal is skipped when unset).
 */
export function validateServerEnv(varName: string, category: string): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Blank - disclaimer modal skipped',
      category,
    };
  }

  const trimmed = value.trim();
  if (!isValidServerEnv(trimmed)) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid value: "${value}" - must be one of: ${SERVER_ENV_VALUES.join(', ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Set to "${trimmed}"`,
    category,
  };
}

const USER_AGENT_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/;

/**
 * Validates proxy user-agent - format X/Y/Z with "Bot" in first segment.
 */
export function validateProxyUserAgent(varName: string, category: string): ValidationResult {
  const value = process.env[varName];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing - must follow format: BrandName Bot Environment/AppName/Version',
      category,
    };
  }

  const trimmed = value.trim();
  if (!USER_AGENT_PATTERN.test(trimmed)) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid format: "${value}" - must follow format: BrandName Bot Environment/AppName/Version`,
      category,
    };
  }

  const firstPart = trimmed.split('/')[0];
  if (firstPart && !firstPart.toLowerCase().includes('bot')) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Missing "Bot" in first part: "${value}"`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: true,
    message: 'Valid format',
    category,
  };
}

/** Supported UI themes (keep in sync with ENV.md / frontend). */
export const SUPPORTED_THEMES = ['dark', 'light', 'dracula', 'violet', 'ember', 'dawn'] as const;

/**
 * Validates NEXT_PUBLIC_SUPPORTED_THEMES - "all-available" or comma-delimited list of valid themes.
 */
export function validateSupportedThemesList(
  varName: string = 'NEXT_PUBLIC_SUPPORTED_THEMES',
  category: string
): ValidationResult {
  const value = process.env[varName] || '';
  const isSet = value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: false,
      isRequired: true,
      message: `Missing - must be "all-available" or comma-delimited list (valid: ${SUPPORTED_THEMES.join(', ')})`,
      category,
    };
  }

  const trimmed = value.trim();
  if (trimmed === 'all-available') {
    return {
      name: varName,
      isSet: true,
      isValid: true,
      isRequired: true,
      message: 'Set to "all-available"',
      category,
    };
  }

  const list = trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const invalid = list.filter(
    (t) => !SUPPORTED_THEMES.includes(t as (typeof SUPPORTED_THEMES)[number])
  );
  if (invalid.length > 0) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid theme(s): ${invalid.join(', ')}. Valid: ${SUPPORTED_THEMES.join(', ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Valid themes: ${list.join(', ')}`,
    category,
  };
}

/**
 * Validates NEXT_PUBLIC_DEFAULT_THEME - must be one of SUPPORTED_THEMES.
 */
export function validateDefaultTheme(
  varName: string = 'NEXT_PUBLIC_DEFAULT_THEME',
  category: string
): ValidationResult {
  const value = process.env[varName] || '';
  const isSet = value.trim() !== '';

  if (!isSet) {
    return {
      name: varName,
      isSet: false,
      isValid: false,
      isRequired: true,
      message: `Missing - must be one of: ${SUPPORTED_THEMES.join(', ')}`,
      category,
    };
  }

  const trimmed = value.trim();
  if (!SUPPORTED_THEMES.includes(trimmed as (typeof SUPPORTED_THEMES)[number])) {
    return {
      name: varName,
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid value: "${value}" - must be one of: ${SUPPORTED_THEMES.join(', ')}`,
      category,
    };
  }

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Set to "${trimmed}"`,
    category,
  };
}

/**
 * Displays validation results by category with checkmarks, then summary and failed/skipped lists.
 * Matches the format used by api and workers startup validation.
 */
export function displayValidationResults(summary: ValidationSummary): void {
  console.log('=== Environment Variable Validation ===');

  const byCategory: Record<string, ValidationResult[]> = {};
  for (const result of summary.results) {
    const category = result.category;
    const list = byCategory[category] ?? (byCategory[category] = []);
    list.push(result);
  }

  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    console.log(`[${category}]`);
    const list = byCategory[category] ?? [];
    for (const r of list) {
      const status = r.isValid ? '✓' : '✗';
      const requiredText = r.isRequired ? '' : ' (optional)';
      const msg = `  ${status} ${r.name}${requiredText} - ${r.message}`;
      if (!r.isValid) {
        console.error(msg);
      } else if (!r.isSet && !r.isRequired) {
        console.warn(msg);
      } else {
        console.log(msg);
      }
    }
  }

  console.log('=== Validation Summary ===');
  console.log(`Total: ${summary.total}`);
  const passedText =
    summary.defaultsUsed > 0
      ? `Passed: ${summary.passed} (${summary.defaultsUsed} using defaults)`
      : `Passed: ${summary.passed}`;
  console.log(passedText);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Required Missing: ${summary.requiredMissing}`);

  if (summary.failed > 0) {
    console.error('The following environment variables failed validation:');
    summary.results
      .filter((r) => !r.isValid)
      .forEach((r) => {
        const requiredText = r.isRequired ? ' (required)' : ' (optional)';
        console.error(`  - ${r.name}${requiredText}: ${r.message}`);
      });
  }

  if (summary.skipped > 0) {
    console.log('Skipped optional variables (not set):');
    summary.results
      .filter((r) => !r.isRequired && !r.isSet)
      .forEach((r) => console.log(`  - ${r.name}`));
  }
}
