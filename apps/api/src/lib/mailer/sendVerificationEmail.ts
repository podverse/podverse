import { config } from '@api/config/index.js';
import { verifyEmailPagePath } from '@api/constants/webAuthPagePaths.js';
import { loggerService } from '@api/factories/loggerService.js';
import { emailTemplate } from '@api/lib/mailer/emailTemplate.js';
import { createTransporter } from '@api/lib/mailer/transporter.js';

export const sendVerificationEmail = async (
  email: string,
  _name: string,
  token: string
): Promise<void> => {
  if (config.mailer.disabled) {
    loggerService.info('Mailer has been disabled, verification email will be skipped');
    return Promise.resolve();
  }

  if (!config.mailer.host) {
    loggerService.logError('Mailer host is not configured, verification email will be skipped');
    return Promise.resolve();
  }

  let transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error('[sendVerificationEmail] failed to create transporter', err);
    throw err;
  }

  const emailFields = {
    buttonLink: `${config.web.protocol}://${config.web.domain}${verifyEmailPagePath}${token}`,
    buttonText: 'Verify Email',
    closing: '',
    headerText: 'Verify your email',
    paragraphText: 'Please click the button below to finish verification.',
    unsubscribeLink: '',
  };

  try {
    await transporter.sendMail({
      from: `${config.brandName} <${config.mailer.from}>`,
      to: email,
      subject: `Verify your email address with ${config.brandName}`,
      html: emailTemplate(emailFields),
      text: `Verify your email by visiting the following: ${emailFields.buttonLink}`,
    });
  } catch (err) {
    console.error('[sendVerificationEmail] mail send failed', err);
  }
};
