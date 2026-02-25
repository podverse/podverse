/**
 * Client-safe validation API. No joi dependency.
 * Use this from apps/web and any other client bundle.
 * Server/API code should use the main package (index) for joi-based validation.
 */

// Inline constant to avoid pulling @podverse/helpers into client; must match DATABASE_CONSTANTS.varchar_password
const PASSWORD_MAX_LENGTH = 36;

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validateEmailClient(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function getEmailErrorKey(email: string): string | undefined {
  if (!email) {
    return 'invalid_email';
  }
  return validateEmailClient(email) ? undefined : 'invalid_email';
}

function validatePasswordClient(password: string): boolean {
  if (password.length < 8 || password.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  if (!/[^a-z]/.test(password)) {
    return false;
  }
  return true;
}

export function getPasswordErrorKey(password: string): string | undefined {
  if (!password) {
    return 'invalid_password';
  }
  return validatePasswordClient(password) ? undefined : 'invalid_password';
}

export function getPassword2ErrorKey(password1: string, password2: string): string | undefined {
  if (!password2) {
    return 'password_mismatch';
  }
  return password1 === password2 ? undefined : 'password_mismatch';
}

export function getPasswordRequirementsInfoKey(): string {
  return 'password_requirements';
}

export {
  validateHttpsUrl,
  validateHttpOrHttpsUrl,
  validateUrlForSSRF,
  isValidHttpUrl,
  isPrivateIP,
  isLocalhost,
} from './url.js';
