import { config } from '@api/config/index.js';

import { logMailerSendFailure, openMailer } from './mailerSendResult.js';

/** Sends the one-time code. The code is the message body and is never logged. */
export async function sendSecondFactorCodeEmail(input: {
  email: string;
  code: string;
}): Promise<'sent' | 'skipped' | 'failed'> {
  const mailer = await openMailer('second_factor');
  if (mailer.status !== 'open') {
    return mailer.status;
  }

  try {
    await mailer.transporter.sendMail({
      from: config.mailer.from,
      to: input.email,
      subject: `${config.brandName} sign-in code`,
      text: [
        `Your ${config.brandName} sign-in code is ${input.code}.`,
        'It expires in 10 minutes and works once.',
        'If you did not try to sign in, you can ignore this email.',
      ].join('\n'),
    });
    return 'sent';
  } catch (err) {
    logMailerSendFailure('Second factor email send failed', err);
    return 'failed';
  }
}
