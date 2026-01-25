import Joi from 'joi';

export function validateEmail(email: string): boolean {
  const schema = Joi.string().email();
  const { error } = schema.validate(email);
  return error ? false : true;
}

export function getEmailErrorKey(email: string): string | undefined {
  if (!email) {return 'invalid_email';}
  return validateEmail(email) ? undefined : 'invalid_email';
}
