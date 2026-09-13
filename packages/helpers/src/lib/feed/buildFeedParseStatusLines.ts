export type FeedParseStatusInput = {
  lastFinishedParseTime: string | null;
  lastFailedParseTime: string | null;
};

export type FeedParseStatusLabels = {
  lastParsed: (date: string) => string;
  lastFailedParse: (date: string) => string;
  neverFullyParsed: string;
};

export type FeedParseStatusLines = {
  lines: string[];
};

/**
 * Describe a feed's parse history as display lines.
 *
 * A failure is only worth reporting when it is more recent than the last success — an old failure
 * followed by a good parse says nothing about the feed's current state. When neither timestamp is
 * present the feed has never been read all the way through, which is its own answer rather than an
 * empty one.
 *
 * Date formatting and copy are supplied by the caller, so the same decision serves a locale-aware
 * web page and a React Native screen without either owning the other's formatter.
 */
export function buildFeedParseStatusLines(
  input: FeedParseStatusInput,
  formatDate: (iso: string) => string,
  labels: FeedParseStatusLabels
): FeedParseStatusLines {
  const successAt = input.lastFinishedParseTime;
  const failedAt = input.lastFailedParseTime;
  const showFailure =
    failedAt !== null &&
    failedAt !== undefined &&
    (successAt === null || successAt === undefined || new Date(failedAt) > new Date(successAt));

  const lines: string[] = [];

  if (successAt !== null && successAt !== undefined) {
    lines.push(labels.lastParsed(formatDate(successAt)));
  }

  if (showFailure && failedAt !== null && failedAt !== undefined) {
    lines.push(labels.lastFailedParse(formatDate(failedAt)));
  }

  if (lines.length === 0) {
    lines.push(labels.neverFullyParsed);
  }

  return { lines };
}
