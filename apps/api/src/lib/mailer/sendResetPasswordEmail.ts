import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import { emailTemplate } from '@api/lib/mailer/emailTemplate.js';
import { createTransporter } from '@api/lib/mailer/transporter.js';

import { convertSecondsToDaysText } from '@podverse/helpers';

export const sendResetPasswordEmail = async (
  email: string,
  _name: string,
  token: string
): Promise<void> => {
  if (config.mailer.disabled) {
    loggerService.info('Mailer has been disabled, password reset email will be skipped');
    return Promise.resolve();
  }

  if (!config.mailer.host) {
    loggerService.logError('Mailer host is not configured, password reset email will be skipped');
    return Promise.resolve();
  }

  const transporter = createTransporter();
  const daysToExpire = convertSecondsToDaysText(`${config.resetPassword.tokenExpiration}`);

  const emailFields = {
    buttonLink: `${config.web.protocol}://${config.web.domain}${config.resetPassword.pagePath}${token}`,
    buttonText: 'Reset Password',
    closing: '',
    headerText: 'Reset your Podverse password',
    paragraphText: `Please click the button below to reset your Podverse password. This link will expire in ${daysToExpire}.`,
    unsubscribeLink: '',
  };

  try {
    await transporter.sendMail({
      from: `Podverse <${config.mailer.from}>`,
      to: email,
      subject: 'Reset your Podverse password',
      html: emailTemplate(emailFields),
      text: `Reset your Podverse password by visiting the following: ${emailFields.buttonLink}`,
    });
  } catch (error) {
    loggerService.logError('Failed to send reset password email', error as Error);
    throw new Error('Internal Server Error', { cause: error });
  }
};
