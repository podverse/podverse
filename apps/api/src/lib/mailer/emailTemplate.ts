import { config } from '@api/config/index.js';

type EmailTemplateParams = {
  buttonLink?: string;
  buttonText?: string;
  headerText?: string;
  paragraphText?: string;
  unsubscribeLink?: string;
};

/** Shared transactional HTML. Plain white layout; optional 3:1 banner is full width at top. */
export const emailTemplate = ({
  buttonLink,
  buttonText,
  headerText,
  paragraphText,
  unsubscribeLink,
}: EmailTemplateParams) => {
  const brandColor = config.brand.colorPrimary;
  const hasBanner = Boolean(config.brand.bannerImage3x1Url);
  const banner = hasBanner
    ? `<div style="background-color: #ffffff; line-height: 0; text-align: center; width: 100%;">
  <img src="${config.brand.bannerImage3x1Url}" alt="${escapeHtml(
    config.brandName
  )}" width="600" style="border: 0; display: block; height: auto; line-height: 0; max-width: 100%; width: 100%;" />
</div>`
    : '';
  const mainContentStyle = hasBanner
    ? 'background-color: #ffffff; border-top: 1px solid #eeeeee; box-sizing: border-box; margin: 0; padding: 32px 24px 24px; text-align: center;'
    : 'background-color: #ffffff; box-sizing: border-box; margin: 0; padding: 32px 24px 24px; text-align: center;';

  return `
  <!doctype html>
  <html lang="en-US">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(config.brandName)}</title>
    </head>
    <body style="background-color: #ffffff; color: #333333; font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0;">
      <div style="background-color: #ffffff; margin: 0 auto; max-width: 600px;">
        ${banner}
        <div style="${mainContentStyle}">
          ${headerText ? `<h1 style="color: #1a1a1a; font-size: 22px; font-weight: 600; margin: 0 0 20px; padding: 0;">${headerText}</h1>` : ''}
          ${paragraphText ? `<p style="color: #333333; font-size: 16px; margin: 0 0 24px; padding: 0;">${paragraphText}</p>` : ''}
          ${
            buttonLink && buttonText
              ? `<a href="${buttonLink}" style="background-color: ${brandColor}; border-radius: 4px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 28px; text-align: center; text-decoration: none;">${buttonText}</a>`
              : ''
          }
        </div>
        <div style="background-color: #ffffff; border-top: 1px solid #eeeeee; color: #666666; font-size: 12px; margin: 0; padding: 24px 20px 32px; text-align: center;">
          ${socialIcons}
          ${addressSection}
          ${
            unsubscribeLink
              ? `<a href="${unsubscribeLink}" style="color: #666666; display: block; margin-top: 20px; text-decoration: underline;">Unsubscribe</a>`
              : ''
          }
        </div>
      </div>
    </body>
  </html>
`;
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const addressSection =
  config.legal.name || config.legal.address
    ? `
  <div style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
    ${config.legal.name}
    ${config.legal.name && config.legal.address ? '<br />' : ''}
    ${config.legal.address}
  </div>
`
    : '';

const socialIconTemplate = (imageUrl: string, pageUrl: string) =>
  imageUrl && pageUrl
    ? `
  <a href="${pageUrl}" style="display: inline-block; margin: 0 8px; vertical-align: middle;">
    <img src="${imageUrl}" alt="" style="display: block; height: 28px; width: 28px;" width="28" height="28" />
  </a>
`
    : '';

const facebookIcon = socialIconTemplate(
  config.social.facebook.imageUrl,
  config.social.facebook.pageUrl
);
const githubIcon = socialIconTemplate(config.social.github.imageUrl, config.social.github.pageUrl);
const redditIcon = socialIconTemplate(config.social.reddit.imageUrl, config.social.reddit.pageUrl);
const twitterIcon = socialIconTemplate(
  config.social.twitter.imageUrl,
  config.social.twitter.pageUrl
);

const socialIcons =
  config.social.facebook.pageUrl ||
  config.social.github.pageUrl ||
  config.social.reddit.pageUrl ||
  config.social.twitter.pageUrl
    ? `
  <div style="margin: 0 0 20px; text-align: center;">
    ${facebookIcon}
    ${githubIcon}
    ${redditIcon}
    ${twitterIcon}
  </div>
`
    : '';
