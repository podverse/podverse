import { getEmailErrorKey } from './email';
import { getPassword2ErrorKey, getPasswordErrorKey } from './password';

export type SignUpValidationResult = {
  emailErrorKey?: string;
  password1ErrorKey?: string;
  password2ErrorKey?: string;
  isValid: boolean;
};

export function validateSignUpFields(email: string, password1: string, password2: string): SignUpValidationResult {
  const emailErrorKey = getEmailErrorKey(email);
  const password1ErrorKey = getPasswordErrorKey(password1);
  const password2ErrorKey = password1 && password2 ? getPassword2ErrorKey(password1, password2) : 'authentication.password_mismatch';
  const isValid = !emailErrorKey && !password1ErrorKey && !password2ErrorKey && !!email && !!password1 && !!password2;
  return {
    ...(emailErrorKey !== undefined ? { emailErrorKey } : {}),
    ...(password1ErrorKey !== undefined ? { password1ErrorKey } : {}),
    ...(password2ErrorKey !== undefined ? { password2ErrorKey } : {}),
    isValid,
  };
}
