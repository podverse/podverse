import Joi from 'joi';

export function validateEmail(email: string): boolean {
  const schema = Joi.string().email();
  const { error } = schema.validate(email);
  return error ? false : true;
}

/**
 * The stored and compared form of an account email: trimmed and lowercase. Sign-in, signup,
 * email change, and imports all compare this form, so letter case never creates a second account.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getEmailErrorKey(email: string): string | undefined {
  if (!email) {
    return 'invalid_email';
  }
  return validateEmail(email) ? undefined : 'invalid_email';
}
