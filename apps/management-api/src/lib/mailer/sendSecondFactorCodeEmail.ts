import { config } from '@management-api/config/index.js';
import { loggerService } from '@management-api/factories/loggerService.js';
import nodemailer from 'nodemailer';

import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

function failureCode(err: unknown): string | undefined {
  if (!isObjectLike(err)) {
    return undefined;
  }
  const code = getOwnPropertyValue(err, 'code');
  return typeof code === 'string' ? code : undefined;
}

/** Sends the one-time code. The code is the message body and is never logged. */
export async function sendSecondFactorCodeEmail(input: {
  email: string;
  code: string;
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (config.mailer.host === '') {
    loggerService.info('Mailer host is not configured, second factor email will be skipped');
    return 'skipped';
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.mailer.host,
      port: Number(config.mailer.port),
      secure: false,
      auth: {
        user: config.mailer.username,
        pass: config.mailer.password,
      },
    });
    await transporter.sendMail({
      from: config.mailer.from,
      to: input.email,
      subject: `${config.brandName} Management sign-in code`,
      text: [
        `Your ${config.brandName} Management sign-in code is ${input.code}.`,
        'It expires in 10 minutes and works once.',
        'If you did not try to sign in, you can ignore this email.',
      ].join('\n'),
    });
    return 'sent';
  } catch (err) {
    loggerService.logError('Second factor email send failed', { code: failureCode(err) });
    return 'failed';
  }
}
