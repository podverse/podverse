const encode = (s: string): string => encodeURIComponent(s);

export const contactEmailLinks = (email: string, brandName: string) => {
  return {
    BUG_REPORT: `mailto:${email}?subject=Bug%20Report%3A%20&body=Please%20include%20your%20browser%20and%20operating%20system%20with%20your%20bug%20report.`,
    FEATURE_REQUEST: `mailto:${email}?subject=Feature%20Request%3A%20&body=${encode(
      `Please describe the feature you would like added to ${brandName}.`
    )}`,
    PODCAST_REQUEST: `mailto:${email}?subject=Podcast%20Request%3A%20&body=Please%20provide%20the%20name%20of%20the%20podcast%2C%20and%20the%20name%20of%20the%20host%20if%20you%20know%20it.`,
    CONTENT_ISSUE: `mailto:${email}?subject=Content%20Issue%20Report%3A%20&body=${encode(
      `To help expedite our response, please provide a link on ${brandName} to the content that you are reporting.`
    )}`,
    GENERAL: `mailto:${email}?subject=General%3A%20`,
  };
};
