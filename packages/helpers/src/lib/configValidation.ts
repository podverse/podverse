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

type ValidationValue = string | null | undefined;

const ABSOLUTE_HTTP_URL_RE = /^https?:\/\//i;

/** True when the env var name denotes a TCP/UDP port (not e.g. OTEL_EXPORTER_*). */
export function isEnvVarPortName(varName: string): boolean {
  return varName === 'PORT' || varName.endsWith('_PORT');
}

function isSetString(value: ValidationValue): value is string {
  return value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';
}

function isPositiveNumericEnv(varName: string): boolean {
  return isEnvVarPortName(varName) || varName.endsWith('_EXPIRATION');
}

export function validateRequiredValue(
  value: ValidationValue,
  varName: string,
  category: string
): ValidationResult {
  const isSet = isSetString(value);

  if (isSet && isPositiveNumericEnv(varName)) {
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

export function validateOptionalValue(
  value: ValidationValue,
  varName: string,
  category: string,
  defaultMessage: string = 'Skipped'
): ValidationResult {
  const normalizedValue = value ?? '';
  const isSet = normalizedValue !== '';

  if (isSet && isPositiveNumericEnv(varName)) {
    const numValue = Number(normalizedValue);
    if (isNaN(numValue) || numValue <= 0) {
      return {
        name: varName,
        isSet: true,
        isValid: false,
        isRequired: false,
        message: `Invalid number: "${normalizedValue}"`,
        category,
      };
    }
  }

  return {
    name: varName,
    isSet,
    isValid: true,
    isRequired: false,
    message: isSet ? 'Set' : defaultMessage,
    category,
  };
}

export function validateOptionalNonEmptyValue(
  value: ValidationValue,
  varName: string,
  category: string
): ValidationResult {
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

  return {
    name: varName,
    isSet: true,
    isValid: true,
    isRequired: false,
    message: 'Set',
    category,
  };
}

export function validateBooleanValue(
  value: ValidationValue,
  varName: string,
  category: string,
  isRequired: boolean = false,
  defaultValue?: string
): ValidationResult {
  const isSet = isSetString(value);

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

export function validatePositiveNumberValue(
  value: ValidationValue,
  varName: string,
  category: string,
  isRequired: boolean = false,
  min: number = 1,
  max?: number
): ValidationResult {
  const isSet = isSetString(value);

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

export function validateAbsoluteHttpUrlValue(
  value: ValidationValue,
  varName: string,
  category: string,
  options?: {
    required?: boolean;
    requiredMessage?: string;
    notSetMessage?: string;
  }
): ValidationResult {
  const required = options?.required ?? false;
  const requiredMessage =
    options?.requiredMessage ?? 'Missing - must be an absolute http:// or https:// URL';
  const notSetMessage = options?.notSetMessage ?? 'Skipped';
  const normalized = value?.trim() ?? '';

  if (normalized === '') {
    return {
      name: varName,
      isSet: false,
      isValid: !required,
      isRequired: required,
      message: required ? requiredMessage : notSetMessage,
      category,
    };
  }

  const ok = ABSOLUTE_HTTP_URL_RE.test(normalized);
  return {
    name: varName,
    isSet: true,
    isValid: ok,
    isRequired: required,
    message: ok ? 'Set' : 'Must be an absolute http:// or https:// URL',
    category,
  };
}
