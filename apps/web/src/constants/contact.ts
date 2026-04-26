import { getConfig } from '../config';

const encode = (s: string): string => encodeURIComponent(s);

export const getContactEmail = (): string => getConfig().public.contact.email;

const brandNameForBody = (): string => getConfig().public.brand.name;

export const CONTACT_EMAIL_LINKS = {
  get BUG_REPORT(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Bug%20Report%3A%20&body=Please%20include%20your%20browser%20and%20operating%20system%20with%20your%20bug%20report.`;
  },
  get FEATURE_REQUEST(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Feature%20Request%3A%20&body=${encode(
      `Please describe the feature you would like added to ${brandNameForBody()}.`
    )}`;
  },
  get PODCAST_REQUEST(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Podcast%20Request%3A%20&body=Please%20provide%20the%20name%20of%20the%20podcast%2C%20and%20the%20name%20of%20the%20host%20if%20you%20know%20it.`;
  },
  get CONTENT_ISSUE(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Content%20Issue%20Report%3A%20&body=${encode(
      `To help expedite our response, please provide a link on ${brandNameForBody()} to the content that you are reporting.`
    )}`;
  },
  get GENERAL(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=General%3A%20`;
  },
};
