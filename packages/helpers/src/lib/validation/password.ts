import { DATABASE_CONSTANTS } from './databaseConstants';

import Joi from 'joi';

const passwordSchema = Joi.string()
  .min(8)
  .max(DATABASE_CONSTANTS.varchar_password)
  .pattern(/[^a-z]/) // at least one non-lowercase character
  .required();

export const validatePassword = (password: string) => {
  const { error } = passwordSchema.validate(password);
  return error ? false : true;
};

export function getPasswordErrorKey(password: string): string | undefined {
  if (!password) {return 'invalid_password';}
  return validatePassword(password) ? undefined : 'invalid_password';
}

export function getPassword2ErrorKey(password1: string, password2: string): string | undefined {
  if (!password2) {return 'password_mismatch';}
  return password1 === password2 ? undefined : 'password_mismatch';
}

export function getPasswordRequirementsInfoKey(): string {
  return 'password_requirements';
}
