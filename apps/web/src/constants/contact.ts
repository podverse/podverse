import { getConfig } from '../config';

export const getContactEmail = (): string => getConfig().public.contact.email;

export const CONTACT_EMAIL_LINKS = {
  get BUG_REPORT(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Bug%20Report%3A%20&body=Please%20include%20your%20browser%20and%20operating%20system%20with%20your%20bug%20report.`;
  },
  get FEATURE_REQUEST(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Feature%20Request%3A%20&body=Please%20describe%20the%20feature%20you%20would%20like%20added%20to%20Podverse.`;
  },
  get PODCAST_REQUEST(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Podcast%20Request%3A%20&body=Please%20provide%20the%20name%20of%20the%20podcast%2C%20and%20the%20name%20of%20the%20host%20if%20you%20know%20it.`;
  },
  get CONTENT_ISSUE(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=Content%20Issue%20Report%3A%20&body=To%20help%20expedite%20our%20response%2C%20please%20provide%20a%20link%20on%20Podverse%20to%20the%20content%20that%20you%20are%20reporting.`;
  },
  get GENERAL(): string {
    const email = getContactEmail();
    return `mailto:${email}?subject=General%3A%20`;
  },
};
