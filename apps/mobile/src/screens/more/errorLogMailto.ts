/**
 * mailto URL for one error report.
 *
 * The whole URL stays within `maxUrlLength`. Mail clients drop longer URLs, so a report that
 * would not fit is left out and `overflowBody` is used instead. The caller copies the full
 * report to the clipboard in that case.
 */
export const ERROR_REPORT_MAILTO_MAX_URL_LENGTH = 1800;

const EMAIL_PATTERN = /^[^\s@/?#&]+@[^\s@/?#&]+$/;

export type ErrorReportMailtoInput = {
  email: string;
  subject: string;
  report: string;
  overflowBody: string;
  maxUrlLength?: number;
};

export type ErrorReportMailto = {
  url: string;
  /** False when the report was too long for a mailto URL. */
  includesReport: boolean;
};

const mailtoUrl = (email: string, subject: string, body: string): string => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const buildErrorReportMailto = (input: ErrorReportMailtoInput): ErrorReportMailto | null => {
  const email = input.email.trim();
  if (!EMAIL_PATTERN.test(email)) {
    return null;
  }

  const maxUrlLength = input.maxUrlLength ?? ERROR_REPORT_MAILTO_MAX_URL_LENGTH;
  const withReport = mailtoUrl(email, input.subject, input.report);
  if (withReport.length <= maxUrlLength) {
    return { includesReport: true, url: withReport };
  }

  return {
    includesReport: false,
    url: mailtoUrl(email, input.subject, input.overflowBody),
  };
};
