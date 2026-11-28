import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import { createTransporter } from '@api/lib/mailer/transporter.js';

import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

export type MailerSendResult = 'sent' | 'skipped' | 'failed';

export type OpenedMailer =
  | { status: 'skipped' }
  | { status: 'failed' }
  | { status: 'open'; transporter: ReturnType<typeof createTransporter> };

const readStringCode = (err: unknown): string | undefined => {
  if (!isObjectLike(err)) {
    return undefined;
  }
  const code = getOwnPropertyValue(err, 'code');
  return typeof code === 'string' ? code : undefined;
};

const readResponseCode = (err: unknown): number | undefined => {
  if (!isObjectLike(err)) {
    return undefined;
  }
  const responseCode = getOwnPropertyValue(err, 'responseCode');
  return typeof responseCode === 'number' ? responseCode : undefined;
};

/** Logs SMTP failure codes only. Message text and credentials stay out of the log. */
export const logMailerSendFailure = (message: string, err: unknown): void => {
  loggerService.logError(message, {
    code: readStringCode(err),
    responseCode: readResponseCode(err),
  });
};

type MailerPurpose = 'verification' | 'email_change' | 'second_factor';

const disabledLog = (purpose: MailerPurpose): string => {
  if (purpose === 'verification') {
    return 'Mailer has been disabled, verification email will be skipped';
  }
  if (purpose === 'email_change') {
    return 'Mailer has been disabled, email change verification email will be skipped';
  }
  return 'Mailer has been disabled, second factor email will be skipped';
};

const missingHostLog = (purpose: MailerPurpose): string => {
  if (purpose === 'verification') {
    return 'Mailer host is not configured, verification email will be skipped';
  }
  if (purpose === 'email_change') {
    return 'Mailer host is not configured, email change verification email will be skipped';
  }
  return 'Mailer host is not configured, second factor email will be skipped';
};

const transporterFailureLog = (purpose: MailerPurpose): string => {
  if (purpose === 'verification') {
    return 'Verification email transporter failed';
  }
  if (purpose === 'email_change') {
    return 'Email change verification transporter failed';
  }
  return 'Second factor email transporter failed';
};

export const openMailer = async (purpose: MailerPurpose): Promise<OpenedMailer> => {
  if (config.mailer.disabled) {
    loggerService.info(disabledLog(purpose));
    return { status: 'skipped' };
  }

  if (!config.mailer.host) {
    loggerService.logError(missingHostLog(purpose));
    return { status: 'skipped' };
  }

  try {
    return { status: 'open', transporter: createTransporter() };
  } catch (err) {
    logMailerSendFailure(transporterFailureLog(purpose), err);
    return { status: 'failed' };
  }
};
